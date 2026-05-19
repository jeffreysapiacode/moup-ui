import {AfterViewChecked, ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
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
export class ContentCard implements OnInit, AfterViewChecked {

  @Input() content: any;
  @Input() innerWidth: any;
  playing: boolean = false;
  elapsedOrSavedTime: any = TimeUtils.formatTime(0);
  apiUrl = environment.apiUrl;
  visible: boolean = false;

  constructor(protected eventBus: EventBus,
              protected audioGlobal: AudioGlobal,
              protected cdr: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    const storedInfo = LocalStorageUtil.getStorage(this.content.uuid);
    this.elapsedOrSavedTime = TimeUtils.formatTime(storedInfo ? storedInfo.seek : 0);
    this.eventBus.onAnimationFrame.subscribe((data: any) => {
      if (data.content.uuid === this.content.uuid) {
        this.elapsedOrSavedTime = TimeUtils.formatTime(data.seek);
        this.cdr.detectChanges();
      }
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

  ngAfterViewChecked(): void {
    const rnd = Math.random() * (650 - 0.01) + 0.01;
    setTimeout(() => {
      this.visible = true;
      this.cdr.detectChanges();
    }, rnd);
  }

  public handleLoad() {
    if (this.content !== this.audioGlobal.content) {
      this.audioGlobal.$changeContentAndPlay(this.content);
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
