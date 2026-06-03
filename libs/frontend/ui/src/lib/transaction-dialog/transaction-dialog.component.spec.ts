import { TestBed } from '@angular/core/testing';
import { DialogRef, DIALOG_DATA, DIALOG_REF } from '../dialog/dialog-ref';
import {
  TransactionDialogComponent,
  TransactionDialogData,
  TransactionDialogResult,
} from './transaction-dialog.component';
import { Transaction } from '@aws/util';

function setup(data: TransactionDialogData) {
  const dialogRef = new DialogRef<TransactionDialogComponent, TransactionDialogResult | undefined>();
  TestBed.configureTestingModule({
    imports: [TransactionDialogComponent],
    providers: [
      { provide: DIALOG_REF, useValue: dialogRef },
      { provide: DIALOG_DATA, useValue: data },
    ],
  });
  const fixture = TestBed.createComponent(TransactionDialogComponent);
  return { component: fixture.componentInstance, dialogRef };
}

describe('TransactionDialogComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('locks ticker and currency when adding to an existing holding', () => {
    const { component } = setup({ mode: 'add', ticker: 'AAPL', lockedCurrency: 'USD' });
    expect(component.tickerLocked).toBe(true);
    expect(component.currencyLocked).toBe(true);
    expect(component.ticker).toBe('AAPL');
    expect(component.currency).toBe('USD');
  });

  it('leaves ticker and currency editable for a new holding', () => {
    const { component } = setup({ mode: 'add' });
    expect(component.tickerLocked).toBe(false);
    expect(component.currencyLocked).toBe(false);
  });

  describe('value ⇄ per-share sync', () => {
    it('derives per-share from total', () => {
      const { component } = setup({ mode: 'add' });
      component.amount = 10;
      component.value = 1500;
      component.recomputePerShareFromTotal();
      expect(component.pricePerShare).toBe(150);
    });

    it('derives total from per-share', () => {
      const { component } = setup({ mode: 'add' });
      component.amount = 4;
      component.pricePerShare = 25;
      component.recomputeTotalFromPerShare();
      expect(component.value).toBe(100);
    });

    it('recomputes total from per-share when amount changes', () => {
      const { component } = setup({ mode: 'add' });
      component.pricePerShare = 10;
      component.amount = 7;
      component.onAmountChange();
      expect(component.value).toBe(70);
    });

    it('guards divide-by-zero when amount is zero', () => {
      const { component } = setup({ mode: 'add' });
      component.amount = 0;
      component.value = 100;
      component.recomputePerShareFromTotal();
      expect(component.pricePerShare).toBe(0);
    });
  });

  it('returns the transaction and original key when editing', () => {
    const original: Transaction = {
      ticker: 'AAPL',
      type: 'stock',
      date: new Date('2023-05-01'),
      amount: 2,
      value: 300,
      currency: 'USD',
    };
    const { component, dialogRef } = setup({ mode: 'edit', transaction: original });

    let result: TransactionDialogResult | undefined;
    dialogRef.afterClosed().subscribe((r) => (result = r));

    component.value = 320;
    component.confirm();

    expect(result?.transaction.value).toBe(320);
    expect(result?.originalKey).toEqual({
      type: 'stock',
      ticker: 'AAPL',
      date: '2023-05-01',
      time: undefined,
      value: 300,
    });
  });
});
