import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  forceValidation,
  getFormErrors,
  isFormValid,
  isObjectEmpty,
  rebuildFormArray,
  resetForm,
  setDisableAllFieldsExcept,
  setDisableFields,
} from 'ngx-easy-forms/form-utils';
import { of } from 'rxjs/internal/observable/of';
import { spy, verify } from 'ts-mockito';
import { FormGroupTyped } from 'ngx-easy-forms/typed-forms';

interface TestForm {
  name: string;
  title: string;
  email: string;
}
describe('Form utils test', () => {
  describe('setDisableFields', () => {
    it('should enable some fields', () => {
      const fb = new FormBuilder();
      const form = fb.group({
        name: { value: '', disabled: true },
        title: { value: '', disabled: true },
        email: { value: '', disabled: true },
      }) as FormGroupTyped<TestForm>;
      setDisableFields(false, form, ['name', 'email']);
      expect(form.controls.name.enabled).toBeTruthy();
      expect(form.controls.email.enabled).toBeTruthy();
      expect(form.controls.title.disabled).toBeTruthy();
    });

    it('should disable some fields', () => {
      const fb = new FormBuilder();
      const form = fb.group({
        name: { value: '', disabled: false },
        title: { value: '', disabled: false },
        email: { value: '', disabled: false },
      }) as FormGroupTyped<TestForm>;
      setDisableFields(true, form, ['name', 'email']);
      expect(form.controls.name.disabled).toBeTruthy();
      expect(form.controls.email.disabled).toBeTruthy();
      expect(form.controls.title.enabled).toBeTruthy();
    });
  });

  describe('setDisableAllFieldsExcept', () => {
    it('should enable some fields', () => {
      const fb = new FormBuilder();
      const form = fb.group({
        name: { value: '', disabled: true },
        title: { value: '', disabled: true },
        email: { value: '', disabled: true },
      }) as FormGroupTyped<TestForm>;
      setDisableAllFieldsExcept(false, form, ['name', 'email']);
      expect(form.controls.name.disabled).toBeTruthy();
      expect(form.controls.email.disabled).toBeTruthy();
      expect(form.controls.title.enabled).toBeTruthy();
    });

    it('should disable some fields', () => {
      const fb = new FormBuilder();
      const form = fb.group({
        name: { value: '', disabled: false },
        title: { value: '', disabled: false },
        email: { value: '', disabled: false },
      }) as FormGroupTyped<TestForm>;
      setDisableAllFieldsExcept(true, form, ['name', 'email']);
      expect(form.controls.name.enabled).toBeTruthy();
      expect(form.controls.email.enabled).toBeTruthy();
      expect(form.controls.title.disabled).toBeTruthy();
    });
  });

  describe('forceValidation', () => {
    it('should call recursively markAsDirty, markAsTouched, updateValueAndValidity', () => {
      const fb = new FormBuilder();
      const form = fb.group({
        name: { value: '', disabled: false },
        title: { value: '', disabled: false },
        email: { value: '', disabled: false },
        group1: fb.group({
          name: { value: '', disabled: false },
          title: { value: '', disabled: false },
          email: { value: '', disabled: false },
          subGroup1: fb.group({
            name: { value: '', disabled: false },
            title: { value: '', disabled: false },
            email: { value: '', disabled: false },
          }),
        }),
      });
      const email1 = spy(form.get('email'));
      const email2 = spy(form.get('group1.email'));
      const email3 = spy(form.get('group1.subGroup1.email'));
      forceValidation(form);
      verify(email1?.markAsDirty()).called();
      verify(email1?.markAsTouched()).called();
      verify(email1?.updateValueAndValidity()).called();
      verify(email2?.markAsDirty()).called();
      verify(email2?.markAsTouched()).called();
      verify(email2?.updateValueAndValidity()).called();
      verify(email3?.markAsDirty()).called();
      verify(email3?.markAsTouched()).called();
      verify(email3?.updateValueAndValidity()).called();
    });
  });

  describe('resetForm', () => {
    it('should call recursively markAsPristine, markAsUntouched, and the controls whose names are in the value', () => {
      const fb = new FormBuilder();
      const form = fb.group({
        name: { value: '', disabled: false },
        title: { value: '', disabled: false },
        email: { value: '', disabled: false },
        group1: fb.group({
          name: { value: '', disabled: false },
          title: { value: '', disabled: false },
          email: { value: '', disabled: false },
          subGroup1: fb.group({
            name: { value: '', disabled: false },
            title: { value: '', disabled: false },
            email: { value: '', disabled: false },
          }),
        }),
      });
      form.patchValue({
        name: 'Gabs',
        title: 'Lord',
        email: 'asdasd',
        group1: {
          name: 'Gabs2',
          title: 'Lord2',
          email: 'asdasd2',
          subGroup1: {
            name: 'Gabs3',
            title: 'Lord3',
            email: 'asdasd3',
          },
        },
      });
      const email = spy(form.get('email'));
      const title = spy(form.get('group1.title'));
      const name = spy(form.get('group1.subGroup1.name'));
      resetForm(form, {
        email: 'sample',
        group1: { title: 'Mr', subGroup1: { name: 'Foo' } },
      });
      verify(email?.markAsPristine()).called();
      verify(email?.markAsUntouched()).called();
      verify(email?.updateValueAndValidity()).called();

      verify(title?.markAsPristine()).called();
      verify(title?.markAsUntouched()).called();
      verify(title?.updateValueAndValidity()).called();

      verify(name?.markAsPristine()).called();
      verify(name?.markAsUntouched()).called();
      verify(name?.updateValueAndValidity()).called();
      expect(form.value).toEqual({
        name: 'Gabs',
        title: 'Lord',
        email: 'sample',
        group1: {
          email: 'asdasd2',
          name: 'Gabs2',
          title: 'Mr',
          subGroup1: {
            email: 'asdasd3',
            name: 'Foo',
            title: 'Lord3',
          },
        },
      });
    });
  });

  describe('isFormValid', () => {
    it('should return true if form valid', async () => {
      const result = await isFormValid({
        status: 'INVALID',
        statusChanges: of(),
      } as FormGroup).toPromise();
      expect(result).toEqual(false);
    });
    it('should return false if form invalid', async () => {
      const result = await isFormValid({
        status: 'VALID',
        statusChanges: of(),
      } as FormGroup).toPromise();
      expect(result).toEqual(true);
    });
    it('should return true if form is PENDING but becomes valid', async () => {
      const result = await isFormValid({
        status: 'PENDING',
        statusChanges: of('VALID'),
      } as FormGroup).toPromise();
      expect(result).toEqual(true);
    });
    it('should return false if form is PENDING but becomes invalid', async () => {
      const result = await isFormValid({
        status: 'PENDING',
        statusChanges: of('INVALID'),
      } as FormGroup).toPromise();
      expect(result).toEqual(false);
    });
  });

  describe('isObjectEmpty', () => {
    it('should return true if null', () => {
      expect(isObjectEmpty(null as any)).toEqual(true);
    });
    it('should return true for {}', () => {
      expect(isObjectEmpty({})).toEqual(true);
    });
    it('should return true for {some:undefined}', () => {
      expect(isObjectEmpty({ some: undefined })).toEqual(true);
    });
    it('should return false for {some:undefined, x: 45}', () => {
      expect(isObjectEmpty({ some: undefined, x: 45 })).toEqual(false);
    });
    //TODO should object like {choice:false} return false? this could be break change in some places
  });

  describe('getFormErrors', () => {
    describe('FormGroups', () => {
      it('should return errors for FormGroup', () => {
        const fb = new FormBuilder();
        const form = fb.group(
          {
            name: ['', Validators.required],
            title: ['', Validators.required],
            email: ['', Validators.required],
            group1: fb.group({
              name: ['', Validators.required],
              title: ['', Validators.required],
              email: ['', Validators.required],
            }),
          },
          { validators: [Validators.email] }
        );
        const errors = getFormErrors(form);
        expect(errors).toEqual({
          groupErrors: {
            email: true,
          },
          email: {
            required: true,
          },
          group1: {
            email: {
              required: true,
            },
            name: {
              required: true,
            },
            title: {
              required: true,
            },
          },
          name: {
            required: true,
          },
          title: {
            required: true,
          },
        });
      });

      it('should return null for valid FormGroup', () => {
        const fb = new FormBuilder();
        const form = fb.group(
          {
            name: ['name', Validators.required],
            title: ['title', Validators.required],
            email: ['email', Validators.required],
          },
          { validators: [Validators.required] }
        );
        const errors = getFormErrors(form);
        expect(errors).toBeNull();
      });
    });

    describe('FormArray', () => {
      it('should return errors for FormArray', () => {
        const fb = new FormBuilder();
        const form = fb.array(
          [
            fb.group({
              name: ['', Validators.required],
              title: ['', Validators.required],
              email: ['', Validators.required],
              group1: fb.group({
                name: ['', Validators.required],
                title: ['', Validators.required],
                email: ['', Validators.required],
              }),
            }),
          ],
          { validators: [Validators.email] }
        );
        const errors = getFormErrors(form);
        expect(errors).toEqual({
          arrayErrors: [
            {
              email: {
                required: true,
              },
              group1: {
                email: {
                  required: true,
                },
                name: {
                  required: true,
                },
                title: {
                  required: true,
                },
              },
              name: {
                required: true,
              },
              title: {
                required: true,
              },
            },
          ],
          groupErrors: {
            email: true,
          },
        });
      });

      it('should return null for valid FormArray', () => {
        const fb = new FormBuilder();
        const form = fb.array(
          [
            fb.group({
              name: ['name', Validators.required],
              title: ['title', Validators.required],
              email: ['email', Validators.required],
            }),
          ],
          { validators: [Validators.required] }
        );
        const errors = getFormErrors(form);
        expect(errors).toEqual(null);
      });
    });
    describe('Control', () => {
      it('should return errors for control', () => {
        const control = new FormControl('', Validators.required);
        const result = getFormErrors(control);
        expect(result).toEqual({ required: true });
      });

      it('should return null for valid control', () => {
        const control = new FormControl('control', Validators.required);
        const result = getFormErrors(control);
        expect(result).toEqual(null);
      });
    });

    it('should return external errors if set or exclude if not ', () => {
      const fb = new FormBuilder();
      const form = fb.group(
        {
          name: ['name', Validators.required],
          title: ['', Validators.required],
          email: ['email', Validators.required],
        },
        { validators: [Validators.required] }
      );
      form.setErrors({ external: { required: true } });
      expect(getFormErrors(form, true)).toEqual({
        groupErrors: {
          external: {
            required: true,
          },
        },
        title: {
          required: true,
        },
      });
      expect(getFormErrors(form, false)).toEqual({
        title: {
          required: true,
        },
      });
    });
  });

  describe('rebuildFormArray', () => {
    it('should sort controls if order of value changes', () => {
      const fb = new FormBuilder();

      interface TestObj {
        id: string;
        name: string;
        title: string;
      }

      const formArray = fb.array([
        fb.group({
          id: ['test-1'],
          name: ['name-1'],
          title: ['title-1'],
        }),
        fb.group({
          id: ['test-2'],
          name: ['name-2'],
          title: ['title-2'],
        }),
      ]);

      const data: TestObj[] = [
        {
          id: 'test-2',
          name: 'name-2',
          title: 'title-2',
        },
        {
          id: 'test-1',
          name: 'name-1',
          title: 'title-1',
        },
      ];

      const buildForm = (value: TestObj): FormGroup => {
        return fb.group({
          id: [value.id],
          name: [value.name],
          title: [value.title],
        });
      };

      rebuildFormArray(formArray, buildForm, data, (data) => data.id);

      expect(formArray.value).toEqual(data);
    });

    it('should delete control if not on the new list of values', () => {
      const fb = new FormBuilder();

      interface TestObj {
        id: string;
        name: string;
        title: string;
      }

      const formArray = fb.array([
        fb.group({
          id: ['test-1'],
          name: ['name-1'],
          title: ['title-1'],
        }),
        fb.group({
          id: ['test-2'],
          name: ['name-2'],
          title: ['title-2'],
        }),
      ]);

      const data: TestObj[] = [
        {
          id: 'test-2',
          name: 'name-2',
          title: 'title-2',
        },
      ];

      const buildForm = (value: TestObj): FormGroup => {
        return fb.group({
          id: [value.id],
          name: [value.name],
          title: [value.title],
        });
      };

      rebuildFormArray(formArray, buildForm, data, (data) => data.id);

      expect(formArray.value.length).toBe(1);
    });

    it('should update and add values to array of controls', () => {
      const fb = new FormBuilder();
      interface TestObj {
        id: string;
        name: string;
        title: string;
      }

      const formArray = fb.array([
        fb.group({
          id: ['test-1'],
          name: ['name-1'],
          title: ['title-1'],
        }),
      ]);

      const data: TestObj[] = [
        {
          id: 'test-1',
          name: 'name-1-updated',
          title: 'title-1',
        },
        {
          id: 'test-2',
          name: 'name-2',
          title: 'title-2',
        },
      ];

      const buildForm = (value: TestObj): FormGroup => {
        return fb.group({
          id: [value.id],
          name: [value.name],
          title: [value.title],
        });
      };

      rebuildFormArray(formArray, buildForm, data, (data) => data.id);

      expect(formArray.value).toEqual(data);
    });
  });
});
