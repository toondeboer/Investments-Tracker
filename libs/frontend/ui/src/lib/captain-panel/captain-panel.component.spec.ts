import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Store } from '@ngrx/store';
import { sendMessage, clearChat } from '@aws/captain';
import { CaptainPanelComponent } from './captain-panel.component';
import { DialogRef, DIALOG_DATA, DIALOG_REF } from '../dialog/dialog-ref';

describe('CaptainPanelComponent', () => {
  let component: CaptainPanelComponent;
  let store: MockStore;
  let dispatch: jest.SpyInstance;
  let dialogRef: DialogRef<CaptainPanelComponent>;

  function setup(data: { demo?: boolean } = {}) {
    dialogRef = new DialogRef<CaptainPanelComponent>();
    TestBed.configureTestingModule({
      imports: [CaptainPanelComponent],
      providers: [
        provideMockStore(),
        { provide: DIALOG_REF, useValue: dialogRef },
        { provide: DIALOG_DATA, useValue: data },
      ],
    });
    const fixture = TestBed.createComponent(CaptainPanelComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);
    dispatch = jest.spyOn(store, 'dispatch');
  }

  it('dispatches sendMessage with the trimmed content and clears the draft', () => {
    setup();
    component.draft = '  How did I do?  ';
    component.send(component.draft);
    expect(dispatch).toHaveBeenCalledWith(
      sendMessage({ content: 'How did I do?', demo: undefined })
    );
    expect(component.draft).toBe('');
  });

  it('forwards the demo flag from dialog data', () => {
    setup({ demo: true });
    component.send('What is my biggest holding?');
    expect(dispatch).toHaveBeenCalledWith(
      sendMessage({ content: 'What is my biggest holding?', demo: true })
    );
  });

  it('ignores an empty or whitespace-only message', () => {
    setup();
    component.send('   ');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('clear() dispatches clearChat', () => {
    setup();
    component.clear();
    expect(dispatch).toHaveBeenCalledWith(clearChat());
  });

  it('close() closes the dialog', () => {
    setup();
    const spy = jest.spyOn(dialogRef, 'close');
    component.close();
    expect(spy).toHaveBeenCalled();
  });
});
