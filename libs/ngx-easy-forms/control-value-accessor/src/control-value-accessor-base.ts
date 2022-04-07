import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  ChangeDetectorRef,
  Directive,
  InjectFlags,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormArray,
  FormBuilder,
  FormGroup,
  NgControl,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { extractTouchedChanges } from './control-value-accesor.utils';
import { SubmitDirective } from 'ngx-easy-forms/submit';
import {
  forceValidation,
  getFormErrors,
  isObjectEmpty,
} from 'ngx-easy-forms/form-utils';
// eslint-disable-next-line no-restricted-imports

import { Observable, Subject } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  skip,
  takeUntil,
} from 'rxjs/operators';

/**
 * Helper class to easy implementation of control value accessor
 */
@Directive()
export abstract class ControlValueAccessorBase<
  T extends AbstractControl = AbstractControl,
  V = any
> implements ControlValueAccessor, OnDestroy, OnInit
{
  destroy$ = new Subject();

  control!: T;
  private readonly injector: Injector;
  private readonly ngControl: NgControl | null = null;
  private submitDirective: SubmitDirective | null = null;
  touch$: Observable<boolean> | undefined;
  private _required = false;
  protected formBuilder!: FormBuilder;
  private changeDetectorRef!: ChangeDetectorRef;

  @Input()
  set required(required: boolean) {
    this._required = coerceBooleanProperty(required);
  }

  get required() {
    return this._required;
  }

  // eslint-disable-next-line @angular-eslint/no-input-rename
  @Input('disabled-control') set disabled(value: boolean) {
    this.setDisabledState(coerceBooleanProperty(value));
  }

  get disabled() {
    return this.control.disabled;
  }

  @Input() set value(value: V) {
    this.control.patchValue(value, { emitEvent: false });
  }

  @Output() valueChanges!: Observable<V>;

  constructor(injector: Injector) {
    this.injector = injector;
    if (this.injector) {
      this.changeDetectorRef = this.injector.get(
        ChangeDetectorRef,
        null,
        InjectFlags.Self
      )!;
      this.ngControl = this.injector.get(
        NgControl,
        null,
        InjectFlags.Self & InjectFlags.Optional
      );
      this.ngControl && (this.ngControl.valueAccessor = this);
      this.formBuilder = this.injector.get(FormBuilder);
      this.control = this.buildControl(this.formBuilder);

      this.submitDirective = this.injector.get(
        SubmitDirective,
        null,
        InjectFlags.Optional
      );
      this.submitDirective?.registerForValidation(this);
    }

    this.initControl();
  }

  private initControl() {
    this.touch$ = extractTouchedChanges(this.control);
    /*
     * We use skip 1 in the pipe that calls onChange to ensure its not been call by
     * the writeValue first call which is done by the outer control to pass the initial
     * value.
     * */
    const isArrayOrGroup =
      this.control instanceof FormArray || this.control instanceof FormGroup;

    this.valueChanges = this.control.valueChanges.pipe(
      isArrayOrGroup
        ? distinctUntilChanged(
            (a, b) => JSON.stringify(a) === JSON.stringify(b)
          )
        : distinctUntilChanged(),
      map((value) => this.beforeChange(value))
    );
    this.valueChanges
      .pipe(skip(1), takeUntil(this.destroy$))
      .subscribe((value) => this.onChange?.(value));
    this.touch$
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => this.onTouch?.(value));
  }

  ngOnInit() {
    this.setValidators();
  }

  private setValidators() {
    if (this.ngControl) {
      this.ngControl.control?.setValidators(
        this.ngControl.control.validator
          ? [
              this.ngControl.control.validator,
              (control: AbstractControl) => this.validate(control),
            ]
          : [(control: AbstractControl) => this.validate(control)]
      );
      this.control.setValidators(
        this.control.validator
          ? [this.control.validator, externalErrorsValidation(this.ngControl)]
          : [externalErrorsValidation(this.ngControl)]
      );
      this.ngControl?.statusChanges
        ?.pipe(
          takeUntil(this.destroy$),
          distinctUntilChanged(),
          /**
           * the following filter is needed to avoid internal calls pathValue which
           * already execute validation to execute another validation when the onChange updates
           * the parent
           */
          filter(
            () =>
              this.ngControl?.value !== this.control.value ||
              this.ngControl?.status !== this.control.status
          )
        )
        .subscribe(() => this.control.updateValueAndValidity());
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  abstract buildControl(fb: FormBuilder): T;

  protected beforeChange(value: any) {
    return this.isControlValueEmpty(value) ? null : value;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onChange = (_value: any) => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onTouch = (_value: any) => {};

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (this.control)
      isDisabled ? this.control.disable() : this.control.enable();
  }

  writeValue(value: any): void {
    if (this.control) this.control.patchValue(this.beforePatch(value));
    this.changeDetectorRef?.markForCheck();
  }

  protected beforePatch(value: any) {
    if (value == null) {
      if (this.control instanceof FormGroup) return {};
      if (this.control instanceof FormArray) return [];
    }
    return value;
  }

  ngOnDestroy() {
    this.submitDirective?.unregisterForValidation(this);
    this.destroy$.next();
    this.destroy$.complete();
  }

  validate(_c: AbstractControl) {
    const errors = this.getAllErrors();
    return isObjectEmpty(errors) ? null : { internal: errors };
  }

  getAllErrors(includeExternal = false) {
    return getFormErrors(this.control, includeExternal);
  }

  requiredField() {
    return (c: AbstractControl) => {
      return this.required
        ? Validators.required(c)
        : this.isControlValueEmpty(this.control?.value)
        ? null
        : Validators.required(c);
    };
  }

  forceValidation() {
    forceValidation(this.control);
  }

  protected isControlValueEmpty(value: any) {
    if (value != null && typeof value === 'object') {
      if (this.control instanceof FormGroup) return isObjectEmpty(value);
      if (Array.isArray(value) && this.control instanceof FormArray) {
        return value.length === 0;
      }
    } else if (value == null) {
      return true;
    }
    return false;
  }
}

export function externalErrorsValidation(ngControl: NgControl): ValidatorFn {
  return (_control: AbstractControl): ValidationErrors | null => {
    const errors = ngControl.errors ? { ...ngControl.errors } : {};
    delete errors?.internal;
    return errors && isObjectEmpty(errors) ? null : { external: errors };
  };
}
