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
  public seek: any = 0;
  public playing: boolean = false;

  public seekMode: boolean = false;

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
      console.log('Ended')
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

  onMouseMove($event: MouseEvent){
    if (this.seekMode){
      this.percentProgress = (($event.clientX / this.trackBarContainer.nativeElement.clientWidth) * 100);
    }
  }

  count: number = 0;

  animate() {
    if (this.globalData.sound && this.playing && !this.seekMode) {
      this.percentProgress = (this.globalData.sound.seek() / this.content.duration) * 100;
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
  }

  handleOnMouseLeave() {
    this.seekMode = false;
  }

  format(elapsed: any) {
    return TimeUtils.formatTime(elapsed);
  }

}
