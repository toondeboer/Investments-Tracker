import { TestBed } from '@angular/core/testing';
import { DatePickerComponent } from './date-picker.component';

describe('DatePickerComponent', () => {
  // No detectChanges(): we exercise the calendar logic directly, which avoids
  // rendering the <lucide-icon> elements (icons aren't registered in the test).
  function create() {
    TestBed.configureTestingModule({ imports: [DatePickerComponent] });
    return TestBed.createComponent(DatePickerComponent).componentInstance;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('writeValue parses the string and sets the displayed month', () => {
    const c = create();
    c.writeValue('2023-06-15');
    expect(c.value).toBe('2023-06-15');
    expect(c.valueDate?.getUTCMonth()).toBe(5); // June
    expect(c.monthLabel).toBe('June 2023');
  });

  it('navigates months and builds a 6×7 grid for the displayed month', () => {
    const c = create();
    c.writeValue('2023-06-15');
    c.prevMonth(); // -> May 2023, triggers buildWeeks
    expect(c.monthLabel).toBe('May 2023');
    expect(c.weeks).toHaveLength(6);
    expect(c.weeks.every((w) => w.length === 7)).toBe(true);
    c.nextMonth(); // back to June
    expect(c.monthLabel).toBe('June 2023');
  });

  it('selectDay updates the value and notifies the form', () => {
    const c = create();
    let changed: string | null = null;
    c.registerOnChange((v) => (changed = v));
    c.selectDay({ date: new Date('2023-06-20'), iso: '2023-06-20', inMonth: true });
    expect(c.value).toBe('2023-06-20');
    expect(changed).toBe('2023-06-20');
  });

  it('isSelected marks the active day', () => {
    const c = create();
    c.writeValue('2023-06-15');
    expect(c.isSelected({ date: new Date('2023-06-15'), iso: '2023-06-15', inMonth: true })).toBe(true);
    expect(c.isSelected({ date: new Date('2023-06-16'), iso: '2023-06-16', inMonth: true })).toBe(false);
  });
});
