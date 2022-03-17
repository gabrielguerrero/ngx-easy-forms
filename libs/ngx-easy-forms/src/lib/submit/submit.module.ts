import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { SubmitDirective } from './submit.directive';

@NgModule({
  declarations: [SubmitDirective],
  imports: [CommonModule],
  exports: [SubmitDirective],
  providers: [],
})
export class SubmitModule {}
