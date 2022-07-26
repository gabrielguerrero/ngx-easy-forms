import { Observable } from 'rxjs';
import { filter, map, startWith, take } from 'rxjs/operators';
import {
  AbstractControl,
  FormGroup,
  FormArray,
  FormControl,
  UntypedFormGroup,
  UntypedFormArray,
} from '@angular/forms';

export function forceValidation(form: AbstractControl, ...fields: string[]) {
  if (form instanceof FormGroup || form instanceof FormArray) {
    for (const inner in form.controls) {
      const control = form.get(inner);
      if (!fields || !fields.length || fields.indexOf(inner) !== -1) {
        control && forceValidation(control);
      }
    }
  } else {
    form.markAsDirty();
    form.markAsTouched();
    form.updateValueAndValidity();
  }
}

export function resetForm(form: FormGroup, value: any) {
  form.patchValue(value);
  patchMarkAsPristineUntouched(form, value);
}

/**
 * will mark as prinstince and untouch only the controls that have its name in value object
 * @param form
 * @param value
 */
function patchMarkAsPristineUntouched(form: AbstractControl, value: any) {
  if (form instanceof FormGroup) {
    for (const prop in value) {
      const control = form.get(prop);
      control && patchMarkAsPristineUntouched(control, value[prop]);
    }
  } else {
    form.markAsPristine();
    form.markAsUntouched();
    form.updateValueAndValidity();
  }
}

export function isFormValid(form: FormGroup): Observable<boolean> {
  return form.statusChanges.pipe(
    startWith(form.status),
    filter((status) => status !== 'PENDING'),
    take(1),
    map((status) => status === 'VALID')
  );
}

export function getFormErrors(form: AbstractControl, includeExternal = false) {
  const errors = form.errors ? { ...form.errors } : {};

  if (!includeExternal) delete errors?.external;

  if (form instanceof FormControl) {
    // Return FormControl errors or null
    return isObjectEmpty(errors) ? null : errors;
  }
  if (form instanceof FormGroup) {
    const groupErrors = errors;

    // Form group can contain errors itself, in that case add'em
    const formErrors = isObjectEmpty(groupErrors)
      ? ({} as any)
      : { groupErrors };
    Object.keys(form.controls).forEach((key) => {
      // Recursive call of the FormGroup fields
      let control = form.get(key);
      const error = control && getFormErrors(control, includeExternal);
      if (error != null) {
        // Only add error if not null
        formErrors[key] = error;
      }
    });
    // Return FormGroup errors or null
    return isObjectEmpty(formErrors) ? null : formErrors;
  }

  if (form instanceof FormArray) {
    const groupErrors = errors;
    // Form group can contain errors itself, in that case add'em
    const arrayErrors: any[] = [];
    form.controls.forEach((control, index) => {
      // Recursive call of the FormGroup fields
      const error = getFormErrors(control, includeExternal);
      if (error != null) {
        // Only add error if not null
        arrayErrors[index] = error;
      }
    });
    let result = {};
    result = isObjectEmpty(groupErrors) ? result : { groupErrors };
    result = arrayErrors.length > 0 ? { ...result, arrayErrors } : result;
    return isObjectEmpty(result) ? null : result;
  }
}

export function isObjectEmpty(value: object) {
  return value == null || Object.values(value).every((v) => !v);
}

export function setDisableAllFieldsExcept<
  T extends {
    [K in keyof T]: AbstractControl<any>;
  },
  K
>(
  disable: boolean,
  form: FormGroup<T>,
  excludedFieldNames: K[],
  emitEvent = false
) {
  for (const control in form.controls) {
    const fieldName = control as unknown as K;
    if (excludedFieldNames.includes(fieldName))
      setDisableField(!disable, form, fieldName, emitEvent);
    else setDisableField(disable, form, fieldName, emitEvent);
  }
}
export function setDisableFields<
  K,
  T extends {
    [K in keyof T]: AbstractControl<any>;
  } = any
>(
  disable: boolean,
  form: FormGroup<T> | UntypedFormGroup,
  fieldNames: K[],
  emitEvent = false
) {
  for (const fieldName of fieldNames) {
    setDisableField(disable, form, fieldName, emitEvent);
  }
}

export function setDisableField<
  T extends {
    [K in keyof T]: AbstractControl<any>;
  },
  K
>(disable: boolean, form: FormGroup<T>, fieldName: K, emitEvent = false) {
  disable
    ? form.get(fieldName as unknown as string)!.disable({ emitEvent })
    : form.get(fieldName as unknown as string)!.enable({ emitEvent });
}

/**
 *
 * @param form
 * @param buildRow
 * @param values
 * @param selectId function that return the identifier of each row
 */
export function rebuildFormArray<T>(
  form: UntypedFormArray | FormArray,
  buildRow: (value: T) => AbstractControl,
  values: T[],
  selectId: (value: T) => string
) {
  // sort controls in the same order as in values
  form.controls.sort((a, b) => {
    const aIndex = values.findIndex((v) => selectId(v) === selectId(a.value));
    const bIndex = values.findIndex((v) => selectId(v) === selectId(b.value));
    return aIndex - bIndex;
  });
  // delete any controls with ids not present in values
  const ids = values.map(selectId);
  for (let index = form.length - 1; index >= 0; index--) {
    const control = form.at(index);
    if (!ids.includes(selectId(control.value))) {
      form.removeAt(index);
    }
  }
  // update or create controls
  values.forEach((value, index) => {
    const control = form.at(index);
    if (control && selectId(control.value) === selectId(value)) {
      control.patchValue(value, { emitEvent: false });
    } else {
      const c = buildRow(value);
      form.insert(index, c);
    }
  });
}
