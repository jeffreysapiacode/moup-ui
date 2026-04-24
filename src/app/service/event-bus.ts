import {EventEmitter, Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class EventBus {

  public onPlay = new EventEmitter();
  public onToggle = new EventEmitter();

}
