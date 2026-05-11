import {ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {EventBus} from '../../service/event-bus';
import {environment} from '../../../environments/environment';
import {TimeUtils} from '../../util/time-utils';
import {LocalStorageUtil} from '../../util/local-storage-util';
import {NgClass, NgStyle} from '@angular/common';
import {AudioGlobal} from '../../service/audio-global';

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
  elapsedOrSavedTime: any = TimeUtils.formatTime(0);
  apiUrl = environment.apiUrl;

  constructor(protected eventBus: EventBus,
              protected audioGlobal: AudioGlobal,
              protected cdr: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    const storedInfo = LocalStorageUtil.getStorage(this.content.uuid);
    if (storedInfo) {
      this.elapsedOrSavedTime = TimeUtils.formatTime(storedInfo.seek);
    }
    this.eventBus.onAnimationFrame.subscribe((data: any) => {
      if (data.content.uuid === this.content.uuid) {
        this.elapsedOrSavedTime = TimeUtils.formatTime(data.seek);
      } else {
        const storage = LocalStorageUtil.getStorage(this.content.uuid);
        if (storage) {
          this.elapsedOrSavedTime = TimeUtils.formatTime(storage.seek);
        } else {
          this.elapsedOrSavedTime = TimeUtils.formatTime(0);
        }
      }
      this.cdr.detectChanges();
    });
    this.eventBus.onPlay.subscribe((content: any) => {
      this.playing = true;
      this.cdr.detectChanges();
    });
    this.eventBus.onPause.subscribe((content: any) => {
      this.playing = false;
      this.cdr.detectChanges();
    });
    this.eventBus.onEnd.subscribe((content: any) => {
      if (this.content.uuid === content.uuid) {
        this.playing = false;
        this.audioGlobal.sound.seek(0);
        this.elapsedOrSavedTime = TimeUtils.formatTime(0);
        LocalStorageUtil.reset(this.audioGlobal.content.uuid);
        this.cdr.detectChanges();
      }
    });
  }

  public handleLoad() {
    if (this.content !== this.audioGlobal.content) {
      this.audioGlobal.setContent(this.content);
    } else {
      if (this.playing) {
        this.audioGlobal.pause();
      } else {
        this.audioGlobal.play();
      }
    }
  }

  protected readonly TimeUtils = TimeUtils;
}
