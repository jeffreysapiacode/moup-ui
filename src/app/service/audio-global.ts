import {Injectable} from '@angular/core';
import {EventBus} from './event-bus';
import {environment} from '../../environments/environment';
import {Howl} from 'howler';

@Injectable({
  providedIn: 'root',
})
export class AudioGlobal {
  public content: any;
  public contentList: any = [];
  public sound: any;
  private apiUrl = environment.apiUrl;

  constructor(private eventBus: EventBus) {
  }

  available() {
    return this.content && this.sound;
  }

  play() {
    this.sound.play();
  }

  pause() {
    this.sound.pause();
  }

  seek() {
    return this.sound.seek();
  }

  setContent(content: any) {
    if (!content) {
      return;
    }
    this.content = content;
    this.setSound(this.content.filename);
    this.eventBus.onLoad.emit(this.content);
  }

  setSound(filename: any) {
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
      this.eventBus.onLoaded.emit(this.content);
    });
    this.sound.on('play', (() => {
      this.eventBus.onPlay.emit(this.content);
    }));
    this.sound.on('pause', () => {
      this.eventBus.onPause.emit(this.content);
    });
    this.sound.on('end', () => {
      this.eventBus.onEnd.emit(this.content);
    });
    this.sound.on('loaderror', () => {
    });
    this.sound.on('playerror', () => {
    });
  }
}
