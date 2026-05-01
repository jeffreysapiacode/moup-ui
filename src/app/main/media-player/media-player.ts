import {ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {EventBus} from '../../service/event-bus';
import {NgClass, NgStyle} from '@angular/common';
import {GlobalData} from '../../service/global-data';
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

  public content: any;
  public isOpen: boolean = false;
  public percentProgress: any = 0;
  public playing: boolean = false;

  public seekMode: boolean = false;
  public seek: any = 0;
  public storedSeek: number = 0;

  public playheadTime: any = TimeUtils.formatTime(0);
  public playheadSeconds: number = 0

  constructor(private eventBus: EventBus, protected globalData: GlobalData, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.eventBus.onLoad.subscribe((content) => {
      this.content = content;
      this.isOpen = true;
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
      this.cdr.detectChanges();
    });
    }

  onPlay() {
    if (this.playing) {
      this.globalData.sound.pause();
    } else {
      this.globalData.sound.play();
      this.eventBus.onPlay.emit(this.content);
    }
  }

  count: number = 0;

  animate() {
    if (this.globalData.sound && this.playing && !this.seekMode) {
      setTimeout(() => (this.percentProgress =  (this.globalData.sound.seek() / this.content.duration) * 100), 0);
      this.eventBus.onSeek.emit({content: this.content, seek: this.globalData.sound.seek()});
      const seekFloor = Math.floor(this.globalData.sound.seek())
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
    let storage: any;
    if (!localStorage.getItem('moup') || localStorage.getItem('moup') === 'undefined') {
      storage = [];
      storage.push({contentUuid: this.content.uuid, seek: seekFloor});
      this.pushToStorage(storage)
    }
    storage = JSON.parse(<string>localStorage.getItem('moup'));
    for (let storedInfo of storage) {
      if (storedInfo.contentUuid === this.content.uuid) {
        storedInfo.seek = seekFloor;
        this.pushToStorage(storage);
        return;
      }
    }
    // Not found
    storage.push({contentUuid: this.content.uuid, seek: seekFloor});
    this.pushToStorage(storage)
  }

  pushToStorage(storage: any) {
    localStorage.setItem('moup', JSON.stringify(storage));
  }

  handleOnMouseEnter() {
    this.seekMode = true;
    this.storedSeek = this.percentProgress;
  }

  handleOnMouseLeave() {
    this.seekMode = false;
    this.percentProgress = this.storedSeek;
  }

  onMouseMove($event: MouseEvent){
    if (this.seekMode) {
      this.percentProgress = (($event.clientX / this.trackBarContainer.nativeElement.clientWidth) * 100);
      this.playheadSeconds = (this.percentProgress / 100) * this.content.duration;
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

  handleClick() {
    this.globalData.sound.seek(this.playheadSeconds * 0.98);
    this.globalData.sound.play();
  }

  handlePrevious() {
  // If less than 3 seconds, go to previous track, if greater, restart
    if (this.globalData.sound.seek() < 3) {
      const index = this.getTrackIndex(this.content.uuid);
      if (index > 0) {
        this.seekTrack(index - 1);
        return;
      }
    }
    this.globalData.sound.seek(0);
  }

  handleNext() {
    const index = this.getTrackIndex(this.content.uuid);
    if (index < (this.globalData.contentList.length - 1)) {
      this.seekTrack(index + 1);
    }
  }

  getTrackIndex(uuid: string): any {
    let index = 0;
    for (let content of this.globalData.contentList) {
      if (uuid === content.uuid) {
        return index;
      }
      index++;
    }
  }

  getContentByIndex(index: number): any {
    let indexStr = 0;
    for (let content of this.globalData.contentList) {
      if (indexStr === index) {
        return content;
      }
      indexStr++;
    }
  }

  seekTrack(index: number) {
    const content = this.getContentByIndex(index);
    this.globalData.setContent(content);
    Howler.stop();
    const storedInfo = LocalStorageUtil.getStorage(this.content.uuid);
    // Check if there is a saved start time
    if (storedInfo) {
      this.globalData.sound.seek(storedInfo.seek);
    }
    this.globalData.sound.play()
  }

}
