import {Injectable} from '@angular/core';
import {EventBus} from './event-bus';
import {environment} from '../../environments/environment';
import {Howl} from 'howler';
import {ActivatedRoute, Router} from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AudioGlobal {
  public content: any;
  public contentList: any = [];
  public sound: any;
  private apiUrl = environment.apiUrl;

  constructor(private eventBus: EventBus,
              private router: Router,
              private route: ActivatedRoute) {
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

  changeContentAndTriggerPlay(content: any) {
    if (!content) {
      return;
    }
    this.content = content;
    this.setSound(this.content.filename);
    this.updateQueryParams(this.content.mmx);
    this.eventBus.onLoad.emit(this.content);
  }

  updateQueryParams(mmx: string) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        mmx: mmx
      },
      queryParamsHandling: 'replace',
      replaceUrl: true
    });
  }

  setSound(filename: any) {
    Howler.stop();
    if (this.sound) {
      this.sound.stop();
    }
    this.sound = new Howl({
      src: [this.apiUrl + '/stream/' + filename],
      autoplay: true,
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
      this.eventBus.onLoadError.emit(this.content);
    });
    this.sound.on('playerror', () => {
      this.eventBus.onPlayError.emit(this.content);
    });
  }
}
