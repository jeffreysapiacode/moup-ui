import {EventEmitter, Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class EventBus {

  public onLoad = new EventEmitter();
  public onPlay = new EventEmitter()
  public onPause = new EventEmitter();
  public onToggle = new EventEmitter();
  public onSeek = new EventEmitter();
  public onEnd = new EventEmitter();

}
