import {ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {EventBus} from '../../service/event-bus';
import { environment } from '../../../environments/environment';
import {Howl} from 'howler';
import {GlobalData} from '../../service/global-data';
import {TimeUtils} from '../../util/time-utils';
import {LocalStorageUtil} from '../../util/local-storage-util';
import {NgClass} from '@angular/common';

@Component({
  selector: 'app-content-card',
  imports: [
    NgClass
  ],
  templateUrl: './content-card.html',
  styleUrl: './content-card.sass',
})
export class ContentCard implements OnInit {

  @Input() public content: any;
  apiUrl = environment.apiUrl;
  time: any = '0:0';

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
        this.time = TimeUtils.formatTime(LocalStorageUtil.getStorage(this.content.uuid).seek);
      }
    })
  }

  public handleLoad() {
    if(this.content !== this.globalData.content) {
      Howler.stop();
      this.globalData.playing = false;
      this.globalData.sound = new Howl({
        src: ['http://localhost:8080/stream/' + this.content.filename],
        html5: true
      });
      this.globalData.sound.once('load', () => {
        // Send play count trigger
      });
      this.globalData.sound.on('play', (() => {
        this.globalData.playing = true;
        this.eventBus.onPlay.emit(this.content);
      }));
      this.globalData.sound.on('pause', () => {
        this.globalData.playing = false;
      });
      this.globalData.sound.on('end', ()=> {
        this.globalData.playing = false;
        this.globalData.sound.seek(0);
      });
      this.globalData.sound.on('loaderror', ()=> {
        this.globalData.playing = false;
      });
      this.globalData.sound.on('playerror', () => {
        this.globalData.playing = false;
      });
      this.globalData.setContent(this.content);
      const storedInfo = LocalStorageUtil.getStorage(this.content.uuid);
      // Check if there is a saved start time
      this.globalData.sound.play()
      if (storedInfo) {
        this.globalData.sound.seek(storedInfo.seek);
      }
    } else {
      if (this.globalData.playing) {
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
