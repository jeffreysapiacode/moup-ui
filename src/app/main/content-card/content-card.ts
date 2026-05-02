import {ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {EventBus} from '../../service/event-bus';
import { environment } from '../../../environments/environment';
import {Howl} from 'howler';
import {GlobalData} from '../../service/global-data';
import {TimeUtils} from '../../util/time-utils';
import {LocalStorageUtil} from '../../util/local-storage-util';
import {NgClass, NgStyle} from '@angular/common';

@Component({
  selector: 'app-content-card',
  imports: [
    NgClass,
    NgStyle
  ],
  templateUrl: './content-card.html',
  styleUrl: './content-card.sass',
})
export class ContentCard implements OnInit {

  @Input() public content: any;
  @Input() public innerWidth: any;
  apiUrl = environment.apiUrl;
  time: any = '0:0';
  public playing: boolean = false;

  constructor(private eventBus: EventBus, protected globalData: GlobalData, private cdr: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    const storedInfo = LocalStorageUtil.getStorage(this.content.uuid);
    if (storedInfo) {
      this.time = TimeUtils.formatTime(storedInfo.seek);
    }
    this.eventBus.onSeek.subscribe((data) => {
      if (data.content.uuid === this.content.uuid) {
        this.time = TimeUtils.formatTime(data.seek);
        this.cdr.detectChanges();
      } else {
        const storage = LocalStorageUtil.getStorage(this.content.uuid);
        if (storage) {
          this.time = TimeUtils.formatTime(storage.seek);
        } else {
          this.time = TimeUtils.formatTime(0);
        }

      }
    });
    this.eventBus.onPlay.subscribe((content) => {
      this.playing = true;
      this.cdr.detectChanges();
    });
    this.eventBus.onPause.subscribe((content) => {
      this.playing = false;
      this.cdr.detectChanges();
    });
    this.eventBus.onEnd.subscribe((content) => {
      if (this.content.uuid === content.uuid) {
        this.globalData.sound.seek(0);
        LocalStorageUtil.reset(this.globalData.content.uuid);
        setTimeout(()=> this.time = TimeUtils.formatTime(0));
        this.playing = false;
        this.cdr.detectChanges();
      }
    });
  }

  public handleLoad() {
    if(this.content !== this.globalData.content) {
      Howler.stop();
      this.globalData.sound = new Howl({
        src: [this.apiUrl + '/stream/' + this.content.filename],
        html5: true
      });
      this.globalData.sound.once('load', () => {
        // Send play count trigger
      });
      this.globalData.sound.on('play', (() => {
        this.eventBus.onPlay.emit(this.content);
      }));
      this.globalData.sound.on('pause', () => {
        this.eventBus.onPause.emit(this.content);
      });
      this.globalData.sound.on('end', ()=> {
        this.eventBus.onEnd.emit(this.content);
      });
      this.globalData.sound.on('loaderror', ()=> {
      });
      this.globalData.sound.on('playerror', () => {
      });
      this.globalData.setContent(this.content);
      const storedInfo = LocalStorageUtil.getStorage(this.content.uuid);
      // Check if there is a saved start time
      this.globalData.sound.play()
      if (storedInfo) {
        this.globalData.sound.seek(storedInfo.seek);
      }
    } else {
      if (this.playing) {
        this.globalData.sound.pause();
      } else {
        this.globalData.sound.play();
        this.eventBus.onPlay.emit(this.content);
      }
    }
  }

  formatTime (seconds: Number) {
    return TimeUtils.formatTime(seconds);
  }

}
