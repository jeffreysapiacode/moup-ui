import {ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
import {EventBus} from '../../service/event-bus';
import {NgClass, NgStyle} from '@angular/common';
import {AudioData} from '../../service/audio-data';
import {LocalStorageUtil} from '../../util/local-storage-util';
import {TimeUtils} from '../../util/time-utils';

@Component({
  selector: 'app-media-player',
  imports: [
    NgClass,
    NgStyle
  ],
  templateUrl: './media-player.html',
  styleUrl: './media-player.sass',
})
export class MediaPlayer implements OnInit {

  @ViewChild('trackBarContainer') trackBarContainer!: ElementRef;
  @ViewChild('trackBar') trackBar!: ElementRef;

  open: boolean = false;
  seek: any = 0;
  playing: boolean = false;
  content: any;
  seekMode: boolean = false;
  percentSeek: any = 0;
  percentProgress: any = 0;
  playheadTime: any = TimeUtils.formatTime(0);

  private seekModeLock: boolean = false;
  private storedSeek: number = 0;
  private playheadSeconds: number = 0
  private innerWidth: any = window.innerWidth;
  private startOffset: any = 0;
  private endOffset: any = 0;

  constructor(protected eventBus: EventBus,
              protected audioData: AudioData,
              protected cdr: ChangeDetectorRef) {}

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.innerWidth = window.innerWidth;
    // Calculate start and end offsets here
    this.calculateOffset();
  }

  ngOnInit(): void {
    this.calculateOffset();
    this.eventBus.onLoad.subscribe((content) => {
      this.content = content;
      this.open = true;
    });
    this.eventBus.onPlay.subscribe((content) => {
      this.animate();
      this.playing = true;
      this.cdr.detectChanges();
    });
    this.eventBus.onPause.subscribe((content) => {
      this.playing = false;
      this.cdr.detectChanges();
    });
    this.eventBus.onSeek.subscribe((data) => {
      this.seek = data.seek;
    });
    this.eventBus.onEnd.subscribe((content) => {
      this.percentProgress = 0;
      this.seek = 0;
      this.playing = false;
      this.handleNext();
      this.cdr.detectChanges();
    });
    }

  calculateOffset() {
    this.startOffset = (0.000002 * (this.innerWidth^2)) - (0.0063 * this.innerWidth) + 6.8816;
    this.endOffset = (0.000004 * (this.innerWidth^2)) - (0.0096 * this.innerWidth) + 107.55;
    console.log('Start Offset:', this.startOffset);
    console.log('End Offset:', this.endOffset);
  }

  onPlay() {
    if (this.playing) {
      this.audioData.sound.pause();
    } else {
      this.audioData.sound.play();
      this.eventBus.onPlay.emit(this.content);
    }
  }

  count: number = 0;

  animate() {
    if (this.audioData.sound && this.playing && !this.seekMode) {
      setTimeout(() => (this.percentProgress = (this.audioData.sound.seek() / this.content.duration) * 100), 0);
      this.eventBus.onSeek.emit({content: this.content, seek: this.audioData.sound.seek()});
      const seekFloor = Math.floor(this.audioData.sound.seek());
      if (seekFloor !== this.count) {
        this.saveToLocalStorage(seekFloor)
        this.count = seekFloor;
      }
      // write to disk every second of playing to save place
      this.cdr.detectChanges();
    }
    requestAnimationFrame(this.animate.bind(this));
  }

  saveToLocalStorage(seekFloor: any) {
    if (!this.content) {
      return;
    }
    let storage: any;
    if (!localStorage.getItem('moup') || localStorage.getItem('moup') === 'undefined') {
      storage = [];
      storage.push({contentUuid: this.content.uuid, seek: seekFloor});
      this.pushToStorage(storage)
    }
    storage = JSON.parse(<string>localStorage.getItem('moup'));
    for (let storedInfo of storage) {
      if (storedInfo.contentUuid === this.content?.uuid) {
        storedInfo.seek = seekFloor;
        this.pushToStorage(storage);
        return;
      }
    }
    // Not found
    storage.push({contentUuid: this.content?.uuid, seek: seekFloor});
    this.pushToStorage(storage)
  }

  pushToStorage(storage: any) {
    localStorage.setItem('moup', JSON.stringify(storage));
  }

  handleOnMouseEnter() {
    this.seekModeLock = false;
    this.seekMode = true;
    this.storedSeek = this.percentProgress;
  }

  handleOnMouseLeave() {
    if (this.seekModeLock){
      return;
    }
    this.seekMode = false;
    this.percentProgress = this.storedSeek;
  }

  onMouseMove($event: MouseEvent){
    if (this.seekMode && !this.seekModeLock) {
      let percentProgressTmp = ($event.clientX / this.trackBarContainer.nativeElement.clientWidth) * 100;
      if (percentProgressTmp < 1.93) {
        this.percentProgress = 1.93;
      } else if (percentProgressTmp > 100.97) {
        this.percentProgress = 100.97;
      } else {
        this.percentProgress = percentProgressTmp;
      }
      this.playheadSeconds = (this.percentProgress / 100) * this.content.duration;
      if (this.audioData.sound) {
        this.percentSeek = (this.audioData.sound.seek() / this.content.duration) * 100;
      }
      this.playheadTime = TimeUtils.formatTime(this.playheadSeconds);
    }
  }

  format(elapsed: any) {
    return TimeUtils.formatTime(elapsed);
  }

  calculate(percentProgress: any, seekMode: boolean) {
    if (seekMode) {
      return percentProgress - 2;
    }
    return percentProgress;
  }

  handleSeek() {
    this.audioData.sound.seek(this.playheadSeconds);
    this.audioData.sound.play();
    this.seekMode = false;
    this.seekModeLock = true;
  }

  handlePrevious() {
  // If less than 3 seconds, go to previous track, if greater, restart
    if (this.audioData.sound.seek() < 3) {
      const index = this.getTrackIndex(this.content.uuid);
      if (index > 0) {
        this.seekTrack(index - 1);
        return;
      }
    }
    this.audioData.sound.seek(0);
    this.percentProgress = 0;
  }

  handleNext() {
    const index = this.getTrackIndex(this.content.uuid);
    if (index < (this.audioData.contentList.length - 1)) {
      this.seekTrack(index + 1);
    }
  }

  getTrackIndex(uuid: string): any {
    let index = 0;
    for (let content of this.audioData.contentList) {
      if (uuid === content.uuid) {
        return index;
      }
      index++;
    }
  }

  getContentByIndex(index: number): any {
    let indexStr = 0;
    for (let content of this.audioData.contentList) {
      if (indexStr === index) {
        return content;
      }
      indexStr++;
    }
  }

  seekTrack(index: number) {
    const content = this.getContentByIndex(index);
    this.audioData.setContent(content);
    const storedInfo = LocalStorageUtil.getStorage(this.content.uuid);
    // Check if there is a saved start time
    if (storedInfo) {
      this.audioData.sound.seek(storedInfo.seek);
    }
    this.audioData.sound.play()
  }
}
