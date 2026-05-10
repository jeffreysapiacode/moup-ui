import {
  ChangeDetectorRef,
  Component,
  DOCUMENT,
  ElementRef,
  HostListener,
  Inject,
  OnInit,
  ViewChild
} from '@angular/core';
import {EventBus} from '../../service/event-bus';
import {NgClass, NgStyle} from '@angular/common';
import {AudioGlobal} from '../../service/audio-global';
import {LocalStorageUtil} from '../../util/local-storage-util';
import {TimeUtils} from '../../util/time-utils';
import {environment} from '../../../environments/environment';
import {HttpClient} from '@angular/common/http';

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
  @ViewChild('playheadTimer') playheadTimer!: ElementRef;

  // Universal
  innerWidth: any = window.innerWidth;
  screenVisible: boolean = true;
  apiUrl = environment.apiUrl;
  open: boolean = false;
  content: any;

  // Track Navigation
  playing: boolean = false;

  // Transcript
  maxWordsOnScreen: number = 3;
  transcriptEnabled: boolean = true;
  wordList: any = [];
  displayArray: any = [];
  wordMap: Map<string, any> = new Map();
  transcriptVisible: boolean = false;
  displayChunk: any;

  // Seek Bar
  rectLeftX = 0;
  rectRightX = 0;
  seekBarMouseMode: boolean = false;
  seekBarTouchMode: boolean = false;
  percentSeek: any = 0;
  percentProgress: any = 0;
  playheadTime: any = TimeUtils.formatTime(0);
  seek: any = 0;
  storedSeek: number = 0;
  playheadSeconds: number = 0;
  seekFloor: any = 0;
  getCurrentChunk: boolean = true;

  // Timer
  count: number = 0;

  @HostListener('document:keydown.space', ['$event'])
  handleGlobalSpaceBar(event: any) {
    event.preventDefault();
    this.handlePlay();
  }

  @HostListener('window:keydown.arrowLeft', ['$event'])
  handleLeftArrow(event: any) {
    // Seek to previous 10 seconds
    event.preventDefault();
    this.seekToTime(this.audioGlobal.seek() - 10);
  }

  @HostListener('window:keydown.arrowRight', ['$event'])
  handleRightArrow(event: any) {
    // Seek to next 10 seconds
    event.preventDefault();
    this.seekToTime(this.audioGlobal.seek() + 10);
  }

  @HostListener('document:visibilitychange', [])
  handleVisibilityChange() {
    if (this.document.visibilityState === 'hidden') {
      this.screenVisible = false;
    } else {
      this.screenVisible = true;
      if (this.transcriptEnabled && this.playing) {
        this.resetTranscript();
      }
      this.cdr.detectChanges();
    }
  }

  constructor(protected eventBus: EventBus,
              protected audioGlobal: AudioGlobal,
              protected http: HttpClient,
              @Inject(DOCUMENT) private document: Document,
              protected cdr: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.eventBus.onLoad.subscribe((content) => {
      this.content = content;
      this.open = true;
    });
    this.eventBus.onPlay.subscribe((content) => {
      this.animate();
      this.playing = true;
      this.resetTranscript();
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

  // Animation Loop
  animate() {
    if (this.audioGlobal.available() && this.playing) {
      if (!this.seekBarMouseMode && !this.seekBarTouchMode) {
        this.percentProgress = (this.audioGlobal.seek() / this.content.duration) * 100;
      }
      if (this.seekBarMouseMode && this.seekBarTouchMode) {
        this.percentSeek = (this.audioGlobal.seek() / this.content.duration) * 100;
      }
      this.eventBus.onSeek.emit({content: this.content, seek: this.audioGlobal.seek()});
      this.seekFloor = Math.floor(this.audioGlobal.seek());
      if (this.displayArray && this.displayArray.length > 0) {
        this.displayChunk = this.getDisplayChunk(this.displayArray);
        this.transcriptVisible = !!(this.displayChunk && this.displayChunk.length > 0);
      }
      if (this.seekFloor !== this.count) {
        if (this.seekFloor % 10 === 0) {
          if (this.transcriptEnabled && this.screenVisible) {
            this.fetchAndCacheTranscript(this.seekFloor);
            const wordListTmp = this.getTranscript(this.seekFloor);
            if (wordListTmp) {
              this.wordList = wordListTmp;
              this.displayArray = this.chunkData(this.wordList);
            }
          }
        }
        this.saveToLocalStorage(this.seekFloor)
        this.count = this.seekFloor;
      }
      this.cdr.detectChanges();
    }
    requestAnimationFrame(this.animate.bind(this));
  }

  // Track Navigation
  // Next
  handleNext() {
    const index = this.getTrackIndex(this.content.uuid);
    if (index < (this.audioGlobal.contentList.length - 1)) {
      this.seekToTrack(index + 1);
    }
  }

  handleNextTap($event: MouseEvent) {
    $event.preventDefault();
    this.seekToTime(this.audioGlobal.seek() + 10);
  }

  // Previous
  handlePreviousTap($event: MouseEvent) {
    $event.preventDefault();
    this.seekToTime(this.audioGlobal.seek() - 10);
  }

  handlePrevious() {
    // If less than 3 seconds, go to previous track, if greater, restart
    if (this.audioGlobal.seek() < 3) {
      const index = this.getTrackIndex(this.content.uuid);
      if (index > 0) {
        this.seekToTrack(index - 1);
        return;
      }
    }
    this.resetTranscript();
    this.audioGlobal.sound.seek(0);
    this.percentProgress = 0;
  }

  // Play/Pause
  handlePlay() {
    if (this.playing) {
      this.audioGlobal.pause();
    } else {
      if (this.audioGlobal.available()) {
        this.audioGlobal.play();
        this.eventBus.onPlay.emit(this.content);
      }
    }
  }

  // Utilities
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

  // Local Storage
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

  // Seek Bar
  seekToTrack(index: number) {
    const content = this.getContentByIndex(index);
    this.audioGlobal.setContent(content);
    const storedInfo = LocalStorageUtil.getStorage(this.content.uuid);
    // Check if there is a saved start time
    if (storedInfo) {
      this.audioGlobal.sound.seek(storedInfo.seek);
    }
    this.audioGlobal.play()
  }

  seekToTime(seek: any) {
    this.resetTranscript();
    this.audioGlobal.sound.seek(seek);
    this.audioGlobal.play();
    if (!this.playing) {
      // Turn off caption window
      this.transcriptVisible = false;
      this.seek = seek;
      this.percentProgress = (seek / this.content.duration) * 100;
    }
  }

  handleSeek() {
    if (this.innerWidth < 576) {
      this.seekBarMouseMode = false;
      this.seekBarTouchMode = false;
      return;
    }
    this.seekToTime(this.playheadSeconds);
  }

  calculateSeekPosition(value: any) {
    let percentProgressTmp = (value / this.trackBarContainer.nativeElement.clientWidth) * 100;
    if (percentProgressTmp < 0) {
      this.percentProgress = 0;
    } else if (percentProgressTmp > 100) {
      this.percentProgress = 100;
    } else {
      this.percentProgress = percentProgressTmp;
    }
    this.playheadSeconds = (this.percentProgress / 100) * this.content.duration;
    this.playheadTime = TimeUtils.formatTime(this.playheadSeconds);
  }

  //// Handle seek w/ mouse
  handleSeekBarMouseMove($event: MouseEvent) {
    if (this.seekBarMouseMode && !this.seekBarTouchMode) {
      const rect = ($event.currentTarget as HTMLElement).getBoundingClientRect();
      const x = $event.clientX - rect.left;
      this.calculateSeekPosition(x);
      this.rectLeftX = (this.playheadTimer.nativeElement as HTMLElement).getBoundingClientRect().left;
      this.rectRightX = (this.playheadTimer.nativeElement as HTMLElement).getBoundingClientRect().right;
      // console.log('Left:' + this.rectLeftX);
      // console.log('Right:' + this.rectRightX);
    }
  }

  handleSeekBarMouseEnter() {
    if (!this.seekBarTouchMode) {
      this.seekBarMouseMode = true;
    }
    this.storedSeek = this.percentProgress;
  }

  handleSeekBarMouseLeave() {
    this.seekBarMouseMode = false;
    this.percentProgress = this.storedSeek;
  }

  //// Handle seek on mobile
  handleSeekBarTouchMove(event: TouchEvent) {
    event.preventDefault();
    if (this.seekBarTouchMode) {
      this.calculateSeekPosition(event.touches[0].clientX);
    }
  }

  handleSeekBarTouchStart(event: TouchEvent) {
    this.seekBarMouseMode = false;
    setTimeout(() => {
      this.seekBarTouchMode = true;
    }, 75)
  }

  handleSeekBarTouchEnd(event: TouchEvent) {
    this.seekBarTouchMode = false;
    this.seekToTime(this.playheadSeconds);
  }

  calculateOffset(value: any, touchMode: boolean, offset: number) {
    return touchMode ? value - offset : value;
  }

  // Transcript
  fetchAndCacheTranscript(seekFloor: any) {
    const seekFloorFloor = (Math.floor(seekFloor / 10) * 10);
    let start = seekFloorFloor;
    let end = seekFloorFloor + 10;
    const compKey = seekFloorFloor + '-' + this.audioGlobal.content.uuid;
    if (this.getCurrentChunk && !this.wordMap.has(compKey)) {
      this.getWords(start, end, compKey);
      this.getCurrentChunk = false;
    }
    const compKey2 = (seekFloorFloor + 10) + '-' + this.audioGlobal.content.uuid;
    if (!this.wordMap.has(compKey2)) {
      this.getWords(start + 10, end + 10, compKey2);
    }
  }

  chunkData(wordList: any) {
    if (!wordList) {
      return;
    }
    let nestedArray: any[] = [];
    let tempArray: any[] = [];
    let counter = 0;
    const length = wordList.length;
    for (const [index, word] of wordList.entries()) {
      tempArray.push(word);
      if (index === (length - 1) && tempArray.length < this.maxWordsOnScreen) {
        const array = nestedArray.at(nestedArray.length - 1)
        if (tempArray.length === 1) {
          array.push(tempArray[0]);
        } else {
          nestedArray.push(tempArray);
        }
      }
      if (counter >= (this.maxWordsOnScreen - 1)) {
        counter = 0;
        nestedArray.push(tempArray);
        tempArray = [];
      } else {
        counter++;
      }
    }
    return nestedArray;
  }

  getWords(start: any, end: any, compKey: string) {
    this.http.get(this.apiUrl + '/auto-dictate?contentUuid=' + this.audioGlobal.content.uuid + '&start=' + start + '&end=' + end).subscribe((response: any) => {
      if (response.length > 0) {
        this.wordMap.set(compKey, response);
        this.wordList = this.getTranscript(this.seekFloor);
        this.displayArray = this.chunkData(this.wordList);
        console.log(this.wordList);
        return response;
      }
    });
  }

  getDisplayChunk(displayArray: any) {
    for (let displayChunk of displayArray) {
      let start = displayChunk[0].start;
      let end = displayChunk[displayChunk.length - 1].end;
      if (this.audioGlobal.seek() > start && this.audioGlobal.seek() < end) {
        return displayChunk;
      }
    }
  }

  getTranscript(seekFloor: any) {
    const compKey = (Math.floor(seekFloor / 10) * 10) + '-' + this.audioGlobal.content.uuid;
    let wordMap = this.wordMap.get(compKey);
    return wordMap;
  }

  resetTranscript() {
    if (this.getCurrentChuckRequired(this.audioGlobal.seek())) {
      this.getCurrentChunk = true;
    }
    this.seekFloor = Math.floor(this.audioGlobal.seek());
    this.fetchAndCacheTranscript(this.seekFloor);
  }

  getCurrentChuckRequired(seconds: number) {
    const seekFloor = (Math.floor(seconds / 10) * 10);
    const compKey = seekFloor + '-' + this.audioGlobal.content.uuid;
    const keyExists = this.wordMap.has(compKey);
    return true;
  }

  // Utilities

  protected readonly TimeUtils = TimeUtils;
}
