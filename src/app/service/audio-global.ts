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

  duration() {
    return this.sound.duration();
  }

  contentExists() {
    return this.contentList && this.contentList.length > 0;
  }

  contentNotExists() {
    return this.contentList && this.contentList.length === 0;
  }

  changeContentAndTriggerPlay(content: any) {
    if (!content) {
      return;
    }
    this.content = content;
    this.setSound(this.content.filename);
    this.router.navigate(['/play']);
    setTimeout(()=>{this.updateQueryParams(this.content.mmx);});
    this.eventBus.onLoad.emit(this.content);
  }

  reconnect() {
    if (this.available()) {
      this.setSound(this.content.filename);
    }
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
      this.sound.unload();
    }
    this.sound = new Howl({
      src: [this.apiUrl + '/stream/' + filename],
      autoplay: true,
      html5: true,
      pool: 1
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
    this.sound.on('loaderror', (id: any, error: any) => {
      this.eventBus.onLoadError.emit(this.content);
    });
    this.sound.on('playerror', (id: any, error: any) => {
      this.eventBus.onPlayError.emit(this.content);
    });
  }
}
