import {
  Component,
  ElementRef,
  forwardRef,
  Input,
  ViewChild,
  ViewContainerRef,
  TemplateRef,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { LucideAngularModule } from 'lucide-angular';

type DayCell = { date: Date; iso: string; inMonth: boolean };

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/**
 * Calendar date picker bound through ngModel as a `YYYY-MM-DD` string. The
 * calendar pops over the trigger via a CDK overlay (the same primitive the
 * DialogService uses). All dates are handled in UTC so the string round-trips
 * cleanly with `new Date('YYYY-MM-DD')`.
 */
@Component({
  selector: 'aws-date-picker',
  templateUrl: './date-picker.component.html',
  styleUrls: ['./date-picker.component.scss'],
  imports: [CommonModule, LucideAngularModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true,
    },
  ],
})
export class DatePickerComponent implements ControlValueAccessor, OnDestroy {
  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);

  @Input() placeholder = 'Select a date';

  @ViewChild('trigger', { static: true }) trigger!: ElementRef<HTMLElement>;
  @ViewChild('calendar', { static: true })
  calendarTemplate!: TemplateRef<unknown>;

  readonly weekdays = WEEKDAYS;

  /** Selected value as a YYYY-MM-DD string (null when unset). */
  value: string | null = null;
  disabled = false;

  /** First-of-month for the month currently displayed in the calendar. */
  viewMonth: Date = startOfMonthUtc(new Date());
  weeks: DayCell[][] = [];

  private overlayRef?: OverlayRef;
  private onChange: (value: string | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  // --- ControlValueAccessor -------------------------------------------------
  writeValue(value: string | null): void {
    this.value = value || null;
    const parsed = this.value ? new Date(this.value) : new Date();
    this.viewMonth = startOfMonthUtc(parsed);
  }
  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // --- Display --------------------------------------------------------------
  get valueDate(): Date | null {
    return this.value ? new Date(this.value) : null;
  }

  get monthLabel(): string {
    return this.viewMonth.toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  // --- Overlay open/close ---------------------------------------------------
  open(): void {
    if (this.disabled || this.overlayRef) return;
    this.buildWeeks();

    this.overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(this.trigger)
        .withPositions([
          {
            originX: 'start',
            originY: 'bottom',
            overlayX: 'start',
            overlayY: 'top',
            offsetY: 6,
          },
          {
            originX: 'start',
            originY: 'top',
            overlayX: 'start',
            overlayY: 'bottom',
            offsetY: -6,
          },
        ]),
    });

    this.overlayRef.backdropClick().subscribe(() => this.close());
    this.overlayRef.keydownEvents().subscribe((e) => {
      if (e.key === 'Escape') this.close();
    });
    this.overlayRef.attach(
      new TemplatePortal(this.calendarTemplate, this.viewContainerRef),
    );
  }

  close(): void {
    this.onTouched();
    this.overlayRef?.detach();
    this.overlayRef?.dispose();
    this.overlayRef = undefined;
  }

  prevMonth(): void {
    this.viewMonth = addMonthsUtc(this.viewMonth, -1);
    this.buildWeeks();
  }

  nextMonth(): void {
    this.viewMonth = addMonthsUtc(this.viewMonth, 1);
    this.buildWeeks();
  }

  selectDay(cell: DayCell): void {
    this.value = cell.iso;
    this.onChange(this.value);
    this.close();
  }

  isSelected(cell: DayCell): boolean {
    return cell.iso === this.value;
  }

  isToday(cell: DayCell): boolean {
    return cell.iso === toIsoUtc(new Date());
  }

  private buildWeeks(): void {
    const first = startOfMonthUtc(this.viewMonth);
    // Monday-first offset (getUTCDay: 0=Sun..6=Sat).
    const offset = (first.getUTCDay() + 6) % 7;
    const start = new Date(first);
    start.setUTCDate(first.getUTCDate() - offset);

    const weeks: DayCell[][] = [];
    const cur = new Date(start);
    for (let w = 0; w < 6; w++) {
      const week: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        week.push({
          date: new Date(cur),
          iso: toIsoUtc(cur),
          inMonth: cur.getUTCMonth() === first.getUTCMonth(),
        });
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      weeks.push(week);
    }
    this.weeks = weeks;
  }

  ngOnDestroy(): void {
    this.overlayRef?.dispose();
  }
}

function startOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonthsUtc(d: Date, months: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
}

function toIsoUtc(d: Date): string {
  return d.toISOString().split('T')[0];
}
