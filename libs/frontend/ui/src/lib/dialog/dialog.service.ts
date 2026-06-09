import { Injectable, Injector, Type, inject } from '@angular/core';
import { Overlay, OverlayConfig } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { FocusTrapFactory } from '@angular/cdk/a11y';
import { fromEvent } from 'rxjs';
import { DialogRef, DIALOG_DATA, DIALOG_REF } from './dialog-ref';

export interface DialogConfig<D = unknown> {
  data?: D;
  width?: string;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  private overlay = inject(Overlay);
  private injector = inject(Injector);
  private focusTrapFactory = inject(FocusTrapFactory);

  open<T, D = unknown, R = unknown>(
    component: Type<T>,
    config: DialogConfig<D> = {},
  ): DialogRef<T, R> {
    const dialogRef = new DialogRef<T, R>();

    const overlayRef = this.overlay.create(
      new OverlayConfig({
        hasBackdrop: true,
        backdropClass: 'dialog-backdrop',
        scrollStrategy: this.overlay.scrollStrategies.block(),
        positionStrategy: this.overlay
          .position()
          .global()
          .centerHorizontally()
          .centerVertically(),
        width: config.width,
      }),
    );

    const contentInjector = Injector.create({
      parent: this.injector,
      providers: [
        { provide: DIALOG_REF, useValue: dialogRef },
        { provide: DIALOG_DATA, useValue: config.data ?? null },
      ],
    });

    overlayRef.attach(new ComponentPortal(component, null, contentInjector));

    const focusTrap = this.focusTrapFactory.create(overlayRef.overlayElement);
    focusTrap.focusInitialElementWhenReady();

    const keydownSub = fromEvent<KeyboardEvent>(document, 'keydown').subscribe(
      (e) => {
        if (e.key === 'Escape') dialogRef.close();
      },
    );

    overlayRef.backdropClick().subscribe(() => dialogRef.close());

    dialogRef.afterClosed().subscribe(() => {
      focusTrap.destroy();
      keydownSub.unsubscribe();
      overlayRef.dispose();
    });

    return dialogRef;
  }
}
