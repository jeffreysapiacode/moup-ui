import {ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
import {EventBus} from '../../service/event-bus';
import {NgClass, NgStyle} from '@angular/common';
import {AudioGlobal} from '../../service/audio-global';
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

  // Plan for auto dictate
  // On content load, fetch fist 12 words, put it in map with page number as the key
  //
  // On UI display, fetch (n) number of words at a time: n, n+1, n+2, n+... ["this", "is", "an", "example"] -> ["<span class='bold'>This</span>"]

  // Each word will be in a string array and the UI will have a function to break it down with a "join". This array will be the thing that makes it so we add <span></span> around the currently spoken word in order to make it bold
  //
  // Find end time for last word of the last segment, subtract 2 seconds, and have that be when we call for the next chunk of 10 words, until we have reached the last page which we will store as a variable
// The other checker splits up the 12 words fetch into segments of n to match the max words allowed on screen at any time,


  @ViewChild('trackBarContainer') trackBarContainer!: ElementRef;
  @ViewChild('trackBar') trackBar!: ElementRef;

  private innerWidth: any = window.innerWidth;

  open: boolean = false;
  seek: any = 0;
  playing: boolean = false;
  content: any;
  seekMode: boolean = false;
  percentSeek: any = 0;
  percentProgress: any = 0;
  playheadTime: any = TimeUtils.formatTime(0);

  // Auto-Dictate
  static MAX_WORDS_ON_SCREEN: number = 3;

  transcriptEnabled: boolean = false;
  currentPage: number = 0;
  totalPages: number = 0;
  wordList: any = [];
  wordSubList: any = [];
  currentDisplay: any;


  // Seek Bar
  private seekModeLock: boolean = false;
  private storedSeek: number = 0;
  private playheadSeconds: number = 0;
  private startOffset: any = 0;
  private endOffset: any = 0;

  constructor(protected eventBus: EventBus,
              protected audioGlobal: AudioGlobal,
              protected cdr: ChangeDetectorRef) {}

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.innerWidth = window.innerWidth;
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
    this.startOffset = (0.000002 * (this.innerWidth ** 2)) - (0.0063 * this.innerWidth) + 6.8816;
    this.endOffset = (0.000004 * (this.innerWidth ** 2)) - (0.0096 * this.innerWidth) + 107.55;
  }

  onPlay() {
    if (this.playing) {
      this.audioGlobal.pause();
    } else {
      this.audioGlobal.play();
      this.eventBus.onPlay.emit(this.content);
    }
  }

  count: number = 0;

  animate() {
    if (this.audioGlobal.available() && this.playing && !this.seekMode) {



      setTimeout(() => (this.percentProgress = (this.audioGlobal.seek() / this.content.duration) * 100), 0);
      this.eventBus.onSeek.emit({content: this.content, seek: this.audioGlobal.seek()});
      const seekFloor = Math.floor(this.audioGlobal.seek());
      if (seekFloor !== this.count) {
        this.saveToLocalStorage(seekFloor)
        this.count = seekFloor;
      }
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
      if (percentProgressTmp < this.startOffset) {
        this.percentProgress = this.startOffset;
      } else if (percentProgressTmp > this.endOffset) {
        this.percentProgress = this.endOffset;
      } else {
        this.percentProgress = percentProgressTmp;
      }
      this.playheadSeconds = (this.percentProgress / 100) * this.content.duration;
      if (this.audioGlobal.sound) {
        this.percentSeek = (this.audioGlobal.seek() / this.content.duration) * 100;
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
    this.audioGlobal.sound.seek(this.playheadSeconds);
    this.audioGlobal.play();
    this.seekMode = false;
    this.seekModeLock = true;
  }

  handlePrevious() {
  // If less than 3 seconds, go to previous track, if greater, restart
    if (this.audioGlobal.seek() < 3) {
      const index = this.getTrackIndex(this.content.uuid);
      if (index > 0) {
        this.seekTrack(index - 1);
        return;
      }
    }
    this.audioGlobal.sound.seek(0);
    this.percentProgress = 0;
  }

  handleNext() {
    const index = this.getTrackIndex(this.content.uuid);
    if (index < (this.audioGlobal.contentList.length - 1)) {
      this.seekTrack(index + 1);
    }
  }

  getTrackIndex(uuid: string): any {
    let index = 0;
    for (let content of this.audioGlobal.contentList) {
      if (uuid === content.uuid) {
        return index;
      }
      index++;
    }
  }

  getContentByIndex(index: number): any {
    let indexStr = 0;
    for (let content of this.audioGlobal.contentList) {
      if (indexStr === index) {
        return content;
      }
      indexStr++;
    }
  }

  seekTrack(index: number) {
    const content = this.getContentByIndex(index);
    this.audioGlobal.setContent(content);
    const storedInfo = LocalStorageUtil.getStorage(this.content.uuid);
    // Check if there is a saved start time
    if (storedInfo) {
      this.audioGlobal.sound.seek(storedInfo.seek);
    }
    this.audioGlobal.play()
  }
}
