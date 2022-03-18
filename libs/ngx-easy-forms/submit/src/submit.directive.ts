import { DOCUMENT } from '@angular/common';
import {
  Directive,
  EventEmitter,
  HostListener,
  Inject,
  Input,
  Optional,
  Output,
} from '@angular/core';
import { FormGroupDirective } from '@angular/forms';
import {
  forceValidation,
  isFormValid,
  resetForm,
} from 'ngx-easy-forms/form-utils';

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[ngxSubmit]',
})
export class SubmitDirective {
  @Output() ngxSubmit = new EventEmitter();

  @Input() resetValue: any;
  @Input() set resetOn(value: boolean) {
    value && this.reset();
  }
  private componentsWithForceValidation: HasForceValidation[] = [];

  constructor(
    private formDirective: FormGroupDirective,
    @Inject(DOCUMENT) @Optional() private _document = document
  ) {}

  @HostListener('focusin')
  storeResetValueIfEmpty() {
    this.resetValue = this.resetValue ?? this.formDirective.form.value;
  }

  @HostListener('reset')
  reset() {
    resetForm(this.formDirective.form, this.resetValue);
    (this.formDirective as { submitted: boolean }).submitted = false;
  }

  @HostListener('submit')
  submit() {
    const form = this.formDirective.form;

    if (form) {
      forceValidation(form);
      for (const c of this.componentsWithForceValidation) {
        c.forceValidation();
      }
      isFormValid(form).subscribe((valid) => {
        if (valid) {
          this.ngxSubmit.emit(form.value);
        } else {
          const element = this._document.querySelector(
            '.mat-form-field-invalid'
          );
          if (element) {
            // we check element.scrollIntoView exist because in jest it doesnt,
            // otherwise will have to mock scrollView in all test
            element.scrollIntoView &&
              element.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
          }
        }
      });
    }
  }

  registerForValidation(component: HasForceValidation) {
    this.componentsWithForceValidation.push(component);
  }

  unregisterForValidation(component: HasForceValidation) {
    this.componentsWithForceValidation =
      this.componentsWithForceValidation.filter((v) => v !== component);
  }
}

export interface HasForceValidation {
  forceValidation(): void;
}
