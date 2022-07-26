import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ControlValueAccessorBase } from './control-value-accessor-base';
import { forceValidation } from 'ngx-easy-forms/form-utils';
// eslint-disable-next-line no-restricted-imports
import { createHostFactory } from '@ngneat/spectator/jest';

describe('ControlValueAccessorBase', () => {
  @Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'my-custom-host',
    template: '',
    changeDetection: ChangeDetectionStrategy.OnPush,
  })
  class CustomHostComponent {
    form = new FormControl<any>(null, Validators.required);

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    valueChanges() {}
  }

  @Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'my-form-control',
    template: '<input type="text" [formControl]="control" [required]="true"> ',
    changeDetection: ChangeDetectionStrategy.OnPush,
  })
  class FormControlComponent extends ControlValueAccessorBase<FormControl> {
    @Input() default: string | undefined;

    ngOnInit() {
      super.ngOnInit();
      if (this.default) this.control.patchValue(this.default);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    buildControl() {
      return new FormControl(null, Validators.required);
    }
  }

  @Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'my-form-group',
    template: `
      <form [formGroup]="control">
        <input type="text" formControlName="name" />
        <input type="text" formControlName="email" />
      </form>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
  })
  class FormGroupComponent extends ControlValueAccessorBase<FormGroup> {
    buildControl(fb: FormBuilder) {
      return fb.group({
        name: [],
        email: [null, Validators.required],
      });
    }
  }

  @Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'my-form-array',
    template: `
      <form [formGroup]="$any(control)">
        <div *ngFor="let city of control.controls; index as i">
          <div [formGroupName]="i">
            <input type="text" formControlName="name" />
            <input type="text" formControlName="email" />
          </div>
        </div>
      </form>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
  })
  /** TODO remove support for FormArray angular forces you to always wrap a form array inside a form group
     because there is no directive like [formGroup] before it worked because types in templates where not check */
  class FormArrayComponent extends ControlValueAccessorBase<FormArray> {
    buildControl(fb: FormBuilder) {
      return fb.array([
        fb.group({
          name: null,
          email: [null, Validators.required],
        }),
        fb.group({
          name: null,
          email: [null, Validators.required],
        }),
      ]);
    }
  }

  const createFormControlComponent = createHostFactory({
    component: FormControlComponent,
    host: CustomHostComponent,
    imports: [ReactiveFormsModule],
  });

  const createFormGroupComponent = createHostFactory({
    component: FormGroupComponent,
    host: CustomHostComponent,
    imports: [ReactiveFormsModule],
  });

  const createFormArrayComponent = createHostFactory({
    component: FormArrayComponent,
    host: CustomHostComponent,
    imports: [ReactiveFormsModule],
  });

  function initFormControl(defaultValue = '', disabled = false) {
    const spectator = createFormControlComponent(
      `<my-form-control (valueChanges)='valueChanges($event)' [formControl]='form' [default]="'${defaultValue}'" [disabled-control]='${disabled}'></my-form-control>`
    );
    const host = spectator.hostComponent as CustomHostComponent;
    const component = spectator.component;
    return {
      spectator,
      component,
      host,
      form: host.form,
      control: component.control,
    };
  }

  function initFormGroup() {
    const spectator = createFormGroupComponent(
      '<my-form-group [formControl]="form" ></my-form-group>'
    );
    const host = spectator.hostComponent as CustomHostComponent;
    const component = spectator.component;
    return {
      spectator,
      component,
      host,
      form: host.form,
      control: component.control,
    };
  }

  function initFormArray() {
    const spectator = createFormArrayComponent(
      '<my-form-array [formControl]="form" ></my-form-array>'
    );
    const host = spectator.hostComponent as CustomHostComponent;
    const component = spectator.component;
    return {
      spectator,
      component,
      host,
      form: host.form,
      control: component.control,
    };
  }

  describe('FormControl Impl', () => {
    it('should set and read from component via form', () => {
      const { form, control } = initFormControl();
      form.patchValue('hi');
      expect(control.value).toEqual('hi');
      control.patchValue('bye');
      expect(form.value).toEqual('bye');
    });
    it('ngOnInit patchValue call should reflect in outer form control', () => {
      const { form } = initFormControl('123');
      expect(form.value).toEqual('123');
    });

    it('should enable and disable from component via form', () => {
      const { form, control } = initFormControl();
      form.disable();
      expect(control.disabled).toBeTruthy();
      form.enable();
      expect(control.enabled).toBeTruthy();
    });

    it('should enable and disable from component via form', () => {
      const { control } = initFormControl('', true);
      expect(control.disabled).toBeTruthy();
    });

    it('check validation includes external errors for the form inside CVA and internal in the form and dirty flag works correctly', () => {
      const { form, control, component } = initFormControl();
      expect(form.dirty).toEqual(false);
      component.forceValidation();
      forceValidation(form);
      expect(form.dirty).toEqual(true);
      expect(control.errors).toEqual({
        external: { required: true },
        required: true,
      });
      expect(form.errors).toEqual({
        required: true,
        internal: { required: true },
      });
    });

    it('check if there are errors setting the inner control to valid also updates the host form control', () => {
      const { form, control, component } = initFormControl();
      expect(form.dirty).toEqual(false);
      component.forceValidation();
      forceValidation(form);
      expect(form.dirty).toEqual(true);
      control.patchValue('123');
      expect(control.errors).toBeNull();
      expect(form.errors).toBeNull();
    });

    it('check if there are errors setting the host form control to valid also updates the inner control', () => {
      const { form, control, component } = initFormControl();
      expect(form.dirty).toEqual(false);
      component.forceValidation();
      forceValidation(form);
      expect(form.dirty).toEqual(true);
      form.patchValue('123');
      expect(control.errors).toBeNull();
      expect(form.errors).toBeNull();
    });

    it('should emit value when not using the reactiveform', () => {
      const { control, host } = initFormControl();

      const valueChangesSpy = jest.spyOn(host, 'valueChanges');
      control.patchValue('test');

      expect(valueChangesSpy).toHaveBeenCalled();
      expect(valueChangesSpy).toHaveBeenCalledWith('test');
    });
  });

  describe('FormGroup Impl', () => {
    it('should set and read from component via form', () => {
      const { form, control } = initFormGroup();
      form.patchValue({ name: 'Bruce', email: 'batman@batcave.com' });
      expect(control.value).toEqual({
        name: 'Bruce',
        email: 'batman@batcave.com',
      });
      control.patchValue({
        name: 'Clark',
        email: 'superman@fortrestofsolitude.com',
      });
      expect(form.value).toEqual({
        name: 'Clark',
        email: 'superman@fortrestofsolitude.com',
      });
      form.patchValue({
        name: '',
        email: '',
      });
      expect(control.value).toEqual({
        name: '',
        email: '',
      });
      expect(form.value).toEqual(null);
    });

    it('should enable and disable from component via form', () => {
      const { form, control } = initFormGroup();
      form.disable();
      expect(control.disabled).toBeTruthy();
      form.enable();
      expect(control.enabled).toBeTruthy();
    });

    it('check validation includes external errors for the form inside CVA and internal in the form', () => {
      const { form, control, component } = initFormGroup();

      component.forceValidation();
      forceValidation(form);
      expect(control.get('email')?.errors).toEqual({ required: true });
      expect(control.errors).toEqual({
        external: { required: true },
      });
      expect(form.errors).toEqual({
        required: true,
        internal: { email: { required: true } },
      });
    });
  });

  describe('FormArray Impl', () => {
    it('should set and read from component via form', () => {
      const { form, control } = initFormArray();
      form.patchValue([
        { name: 'Bruce', email: 'batman@batcave.com' },
        {
          name: 'Clark',
          email: 'superman@fortrestofsolitude.com',
        },
      ]);
      expect(control.value).toEqual([
        { name: 'Bruce', email: 'batman@batcave.com' },
        {
          name: 'Clark',
          email: 'superman@fortrestofsolitude.com',
        },
      ]);
      control.patchValue([
        { name: 'Tony', email: 'ironman@stark.com' },
        {
          name: 'Bruce',
          email: 'hulk@gammalabs.com',
        },
      ]);
      expect(form.value).toEqual([
        { name: 'Tony', email: 'ironman@stark.com' },
        {
          name: 'Bruce',
          email: 'hulk@gammalabs.com',
        },
      ]);
      control.clear();
      control.patchValue([]);
      expect(control.value).toEqual([]);
      expect(form.value).toEqual(null);
    });

    it('should enable and disable from component via form', () => {
      const { form, control } = initFormArray();
      form.disable();
      expect(control.disabled).toBeTruthy();
      form.enable();
      expect(control.enabled).toBeTruthy();
    });

    it('check validation includes external errors for the form inside CVA and internal in the form', () => {
      const { form, control, component } = initFormArray();

      component.forceValidation();
      forceValidation(form);
      expect(control.errors).toEqual({ external: { required: true } });
      expect(form.errors).toEqual({
        internal: {
          arrayErrors: [
            { email: { required: true } },
            { email: { required: true } },
          ],
        },
        required: true,
      });
      control.clear();
      component.forceValidation();
      expect(control.errors).toEqual({ external: { required: true } });
      expect(form.errors).toEqual({
        required: true,
      });
    });
  });
});
