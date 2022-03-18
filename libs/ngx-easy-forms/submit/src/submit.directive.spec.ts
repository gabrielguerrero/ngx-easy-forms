import { fakeAsync, tick } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { spy, verify } from 'ts-mockito';
import { SubmitDirective } from './submit.directive';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { createDirectiveFactory } from '@ngneat/spectator/jest';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

describe('SubmitDirective', () => {
  const template = `
    <form [formGroup]="form" (ngxSubmit)="submit()">

      <mat-form-field label="Name" data-test="name">
        <input formControlName="name" matInput type="text" class="form-control" />
      </mat-form-field>
      <mat-form-field label="Email" data-test="email">
        <input formControlName="email" matInput type="text" id="email" class="form-control" />

      </mat-form-field>
      <button type="submit"></button>
    </form>
  `;

  @Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'something',
    template: '',
    changeDetection: ChangeDetectionStrategy.OnPush,
  })
  class CustomHostComponent {
    @Input() form = new FormBuilder().group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
    });

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    submit() {}
  }

  function init(
    template: string,
    form = new FormBuilder().group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
    })
  ) {
    const spectator = createDirective(template, {
      hostProps: {
        form,
      },
    });
    const directive = spectator.directive;
    const host = spectator.hostComponent as CustomHostComponent;
    return {
      spectator,
      directive,
      host,
      form: host.form,
    };
  }

  const createDirective = createDirectiveFactory({
    directive: SubmitDirective,
    host: CustomHostComponent,
    imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  });

  const elementMock = {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    scrollIntoView: (arg: any) => {},
  };

  it('on form submit check on input error form was not submitted', () => {
    const { spectator, form, host } = init(template);
    const hostSpy = spy(host);
    spectator.query('form')?.dispatchEvent(new Event('submit'));
    spectator.detectChanges();
    expect(form.invalid).toBeTruthy();
    verify(hostSpy.submit()).never();
  });

  it('on form submit check submit happens if form valid', () => {
    const { spectator, form, host } = init(template);
    const hostSpy = spy(host);
    form.patchValue({ name: 'Gabriel', email: 'gabriel@email.com' });
    spectator.query('form')?.dispatchEvent(new Event('submit'));
    spectator.detectChanges();
    expect(form.invalid).toBeFalsy();
    verify(hostSpy.submit()).once();
  });

  it('check on error is scrolled to first available error', () => {
    const invalidSelector = '.mat-form-field-invalid';
    const { spectator } = init(template);

    const documentQuerySelectorSpy = jest
      .spyOn(document, 'querySelector')
      .mockImplementation((selector) =>
        selector === invalidSelector
          ? (elementMock as Element)
          : document.querySelector(selector)
      );
    const elementScrollIntoViewSpy = jest.spyOn(elementMock, 'scrollIntoView');
    spectator.query('form')?.dispatchEvent(new Event('submit'));
    spectator.detectChanges();
    expect(documentQuerySelectorSpy).toHaveBeenCalledTimes(1);
    expect(documentQuerySelectorSpy).toHaveBeenCalledWith(invalidSelector);
    expect(elementScrollIntoViewSpy).toHaveBeenCalledTimes(1);
    expect(elementScrollIntoViewSpy).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
    documentQuerySelectorSpy.mockRestore();
    elementScrollIntoViewSpy.mockRestore();
  });

  describe(' Async validators test', () => {
    it('ensure if async validators fail the form is not submitted', fakeAsync(() => {
      const form2 = new FormBuilder().group({
        name: [
          '',
          [Validators.required],
          () => of({ asyncError: true }).pipe(delay(800)),
        ],
        email: [
          '',
          [Validators.required],
          () => of({ asyncError: true }).pipe(delay(1000)),
        ],
      });

      const { spectator, form, host } = init(template, form2);
      const hostSpy = spy(host);
      form2.patchValue({ name: 'Gabriel', email: 'gabriel@email.com' });
      spectator.query('form')?.dispatchEvent(new Event('submit'));
      verify(hostSpy.submit()).never();
      tick(1000);
      spectator.detectChanges();
      verify(hostSpy.submit()).never();
      expect(form2.controls.name.errors).toEqual({ asyncError: true });
      expect(form2.controls.email.errors).toEqual({ asyncError: true });
    }));

    it('ensure if async validators succeed the form is not submitted', fakeAsync(() => {
      const form2 = new FormBuilder().group({
        name: ['', [Validators.required], () => of(null).pipe(delay(800))],
        email: ['', [Validators.required], () => of(null).pipe(delay(1000))],
      });

      const { spectator, host } = init(template, form2);
      const hostSpy = spy(host);
      form2.patchValue({ name: 'Gabriel', email: 'gabriel@email.com' });
      spectator.query('form')?.dispatchEvent(new Event('submit'));
      verify(hostSpy.submit()).never();
      tick(1000);
      spectator.detectChanges();
      verify(hostSpy.submit()).once();
      expect(form2.controls.name.errors).toBeNull();
      expect(form2.controls.email.errors).toBeNull();
    }));

    it.todo('ensure a reset button calls reset logic');
    it.todo('ensure a if resetOn is true reset logic is called');
    it.todo(
      'ensure a if no resetValue after the first touch  form.vale is store as resetValue'
    );
    it.todo('ensure a if resetValue is set is use on reset');
  });
});
