import { Injectable } from '@angular/core';
import {EventBus} from './event-bus';
import {environment} from '../../environments/environment';
import {Howl} from 'howler';

@Injectable({
  providedIn: 'root',
})
export class AudioData {
  public content: any;
  public contentList: any = [];
  public sound: any;
  private apiUrl = environment.apiUrl;

  constructor(private eventBus: EventBus) {
  }

  setContent(content: any) {
    this.content = content;
    if (this.content) {
      this.resetSound(this.content.filename);
    } else {
      console.error('Content not found');
    }
    this.eventBus.onLoad.emit(this.content);
  }

  resetSound(filename: any) {
    Howler.stop();
    if (this.sound) {
      this.sound.stop();
    }
    this.sound = new Howl({
      src: [this.apiUrl + '/stream/' + filename],
      html5: true
    });
    this.sound.once('load', () => {
      // Send play count trigger
    });
    this.sound.on('play', (() => {
      this.eventBus.onPlay.emit(this.content);
    }));
    this.sound.on('pause', () => {
      this.eventBus.onPause.emit(this.content);
    });
    this.sound.on('end', ()=> {
      this.eventBus.onEnd.emit(this.content);
    });
    this.sound.on('loaderror', ()=> {
    });
    this.sound.on('playerror', () => {
    });
  }

}
