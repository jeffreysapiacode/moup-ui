import {EventEmitter, Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class EventBus {
  public onLoad = new EventEmitter();
  public onLoadError = new EventEmitter();
  public onPlayError = new EventEmitter();
  public onLoaded = new EventEmitter();
  public onPlay = new EventEmitter()
  public onPause = new EventEmitter();
  public onAnimationFrame = new EventEmitter();
  public onEnd = new EventEmitter();
}
