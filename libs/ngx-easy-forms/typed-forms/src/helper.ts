import { AbstractControlOptions, FormBuilder } from '@angular/forms';
import { FormGroupBuilderOptionsTyped, FormGroupTyped } from './';
import { FormArrayTyped } from './typed-forms';

export function typedFbGroup<T, TArrayOverride extends keyof T = never>(
  fb: FormBuilder,
  controlsConfig: FormGroupBuilderOptionsTyped<T>,
  options?: AbstractControlOptions,
) {
  return fb.group(controlsConfig, options) as FormGroupTyped<T, TArrayOverride>;
}

export function typedFbArray<T>(
  fb: FormBuilder,
  controlsConfig: FormGroupBuilderOptionsTyped<T>[],
  options?: AbstractControlOptions,
) {
  return fb.array(controlsConfig, options) as FormArrayTyped<T>;
}
