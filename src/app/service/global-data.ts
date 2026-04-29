import { Injectable } from '@angular/core';
import {EventBus} from './event-bus';

@Injectable({
  providedIn: 'root',
})
export class GlobalData {
  public content: any;
  public playing: boolean = false;
  public sound: any;

  constructor(private eventBus: EventBus) {
  }

  setContent(content: any) {
    this.content = content;
    this.eventBus.onLoad.emit(this.content);
  }

}
