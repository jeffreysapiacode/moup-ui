import {ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {EventBus} from '../../service/event-bus';
import { environment } from '../../../environments/environment';
import {TimeUtils} from '../../util/time-utils';
import {LocalStorageUtil} from '../../util/local-storage-util';
import {NgClass, NgStyle} from '@angular/common';
import {AudioData} from '../../service/audio-data';

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

  @Input() content: any;
  @Input() innerWidth: any;
  playing: boolean = false;
  time: any = TimeUtils.formatTime(0);
  apiUrl = environment.apiUrl;

  constructor(protected eventBus: EventBus,
              protected audioData: AudioData,
              protected cdr: ChangeDetectorRef) {
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
        this.audioData.sound.seek(0);
        LocalStorageUtil.reset(this.audioData.content.uuid);
        setTimeout(()=> this.time = TimeUtils.formatTime(0));
        this.playing = false;
        this.cdr.detectChanges();
      }
    });
  }

  public handleLoad() {
    if(this.content !== this.audioData.content) {
      this.audioData.setContent(this.content);
      const storedInfo = LocalStorageUtil.getStorage(this.content.uuid);
      // Check if there is a saved start time
      this.audioData.sound.play()
      if (storedInfo) {
        this.audioData.sound.seek(storedInfo.seek);
      }
    } else {
      if (this.playing) {
        this.audioData.sound.pause();
      } else {
        this.audioData.sound.play();
        this.eventBus.onPlay.emit(this.content);
      }
    }
  }

  formatTime (seconds: Number) {
    return TimeUtils.formatTime(seconds);
  }

}
