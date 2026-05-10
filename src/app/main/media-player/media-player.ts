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
  @ViewChild('playButton') playButton!: ElementRef;

  // Universal
  innerWidth: any = window.innerWidth;
  screenVisible: boolean = true;
  apiUrl = environment.apiUrl;
  open: boolean = false;
  content: any;
  loading: boolean = false;

  // Transcript
  maxWordsOnScreen: number = 3;
  lookaheadSeconds: number = 10;
  transcriptEnabled: boolean = true;
  wordList: any = [];
  displayArray: any = [];
  wordMap: Map<string, any> = new Map();
  transcriptVisible: boolean = false;
  displaySegment: any;
  displaySegmentStored: any;

  // Track Navigation
  playing: boolean = false;

  // Seek Bar
  rectLeftX = 0;
  rectRightX = 0;
  seekBarMouseMode: boolean = false;
  seekBarTouchMode: boolean = false;
  percentProgressPlaceholder: any = 0;
  percentProgress: any = 0;
  playheadTime: any = TimeUtils.formatTime(0);
  seek: any = 0;
  storedSeek: number = 0;
  playheadSeconds: number = 0;
  seekFloor: any = 0;
  seekFloorStored: number = 0;

  @HostListener('document:keydown.space', ['$event'])
  handleGlobalSpaceBar(event: any) {
    event.preventDefault();
    this.playButton.nativeElement.focus();
    setTimeout(() => {this.playButton.nativeElement.blur();}, 500)
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
        this.cacheTranscript();
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
    this.eventBus.onLoad.subscribe((content: any) => {
      this.content = content;
      this.open = true;
      const storedInfo = LocalStorageUtil.getStorage(this.content.uuid);
      // Check if there is a saved start time
      if (storedInfo) {
        this.seekToTime(storedInfo.seek);
      }
      this.audioGlobal.play();
    });
    this.eventBus.onPlay.subscribe((content: any) => {
      this.animate();
      this.playing = true;
      this.cacheTranscript();
      this.cdr.detectChanges();
    });
    this.eventBus.onPause.subscribe((content: any) => {
      this.playing = false;
      this.cdr.detectChanges();
    });
    this.eventBus.onEnd.subscribe((content: any) => {
      this.percentProgress = 0;
      this.seek = 0;
      this.playing = false;
      this.handleNext();
      this.cdr.detectChanges();
    });
    this.eventBus.onAnimationFrame.subscribe((data: any) => {
      this.seek = data.seek;
    });
  }

  // Animation Loop
  animate() {
    if (this.playing) {
      this.eventBus.onAnimationFrame.emit({content: this.content, seek: this.audioGlobal.seek()});
      this.seekBarMouseMode || this.seekBarTouchMode ?
        this.percentProgressPlaceholder = (this.audioGlobal.seek() / this.content.duration) * 100:
        this.percentProgress = (this.audioGlobal.seek() / this.content.duration) * 100;
      this.displaySegment = this.getDisplaySegment(this.displayArray);
      this.transcriptVisible = !!(this.displaySegment && this.displaySegment.length > 0);
      this.seekFloor = Math.floor(this.audioGlobal.seek());
      // Happens every 1 second of play time
      if (this.seekFloor !== this.seekFloorStored ) {
        if (this.transcriptEnabled && this.screenVisible) {
          this.cacheTranscript();
        }
        this.saveToLocalStorage(this.seekFloor);
        this.seekFloorStored = this.seekFloor;
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
    this.cacheTranscript();
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

  // Seek Bar /////////////////////////////////
  seekToTrack(index: number) {
    const content = this.getContentByIndex(index);
    this.audioGlobal.setContent(content);
    const storedInfo = LocalStorageUtil.getStorage(this.content.uuid);
    // Check if there is a saved start time
    if (storedInfo) {
      this.seekToTime(storedInfo.seek);
    }
    this.audioGlobal.play()
  }

  seekToTime(seek: any) {
    this.cacheTranscript();
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
      // this.rectLeftX = (this.playheadTimer.nativeElement as HTMLElement).getBoundingClientRect().left;
      // this.rectRightX = (this.playheadTimer.nativeElement as HTMLElement).getBoundingClientRect().right;
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

  // Transcript //////////////////////////////
  getDisplaySegment(displayArray: any) {
    if (!displayArray || displayArray.length === 0) {
      return;
    }
    for (let i = 0; i<displayArray.length; i++) {
      let displaySegment = displayArray[i];
      let previousSegment;
      let nextSegment;
      if (i > 0) {
        previousSegment = displayArray[i-1][displayArray[i-1].length - 1];
      }
      if (i < displayArray.length - 1) {
        nextSegment = displayArray[i+1][0];
      }
      let start = previousSegment ? previousSegment.end : displaySegment[0].start;
      let end = nextSegment ? nextSegment.start : displaySegment[displaySegment.length - 1].end;
      if (this.audioGlobal.seek() > start && this.audioGlobal.seek() < end) {
        if (!displaySegment && this.displaySegmentStored) {
          return this.displaySegmentStored
        }
        this.displaySegmentStored = displaySegment;
        return displaySegment;
      }
    }

    // for (let displayChunk of displayArray) {
    //   let start = displayChunk[0].start;
    //   let end = displayChunk[displayChunk.length - 1].end;
    //   if (this.audioGlobal.seek() > start && this.audioGlobal.seek() < end) {
    //     return displayChunk;
    //   }
    // }
    return;
  }

  getWordsFromAPI(start: number, key: string) {
    this.http.get(this.apiUrl + '/auto-dictate',
      { params: {
        contentUuid: this.audioGlobal.content.uuid,
          start: start,
          end: (start + this.lookaheadSeconds)}})
      .subscribe((response: any) => {
        if (response.length > 0) {
          this.wordMap.set(key, response);
          this.wordList = this.getTranscript(this.seekFloor);
          this.displayArray = this.segmentWords(this.wordList);
        }
    });
  }

  segmentWords(wordList: any) {
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

  getTranscript(seekFloor: any) {
    return this.wordMap.get(this.buildCacheKey(seekFloor, this.audioGlobal.content.uuid));
  }

  cacheTranscript() {
    const cacheKey = this.buildCacheKey(this.seekFloor, this.audioGlobal.content.uuid);
    if (!this.wordMap.has(cacheKey)) {
      this.getWordsFromAPI(this.calculateSeekFloorMultiple(this.seekFloor), cacheKey);
    }
    const preCacheSeconds = this.seekFloor + this.lookaheadSeconds;
    const cacheKey2 = this.buildCacheKey(preCacheSeconds, this.audioGlobal.content.uuid);
    if (!this.wordMap.has(cacheKey2) && ((this.seekFloor + this.lookaheadSeconds) < this.audioGlobal.content.duration)) {
      this.getWordsFromAPI(this.calculateSeekFloorMultiple(preCacheSeconds), cacheKey2);
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
      localStorage.setItem('moup', JSON.stringify(storage));
    }
    storage = JSON.parse(<string>localStorage.getItem('moup'));
    for (let storedInfo of storage) {
      if (storedInfo.contentUuid === this.content?.uuid) {
        storedInfo.seek = seekFloor;
        localStorage.setItem('moup', JSON.stringify(storage));
        return;
      }
    }
    // Not found
    storage.push({contentUuid: this.content?.uuid, seek: seekFloor});
    localStorage.setItem('moup', JSON.stringify(storage));
  }

  // Utilities
  buildCacheKey(seek: number, contentUuid: string) {
    return `${(Math.floor(seek / 10) * 10)}-${contentUuid}`;
  }

  calculateSeekFloorMultiple(seekFloor: number) {
    return (Math.floor(seekFloor / this.lookaheadSeconds) * this.lookaheadSeconds)
  }

  protected readonly TimeUtils = TimeUtils;
}
