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
import {Router} from '@angular/router';

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
  loading: boolean = false;
  loadError: boolean = false;
  loadErrorIntervalId: any;
  loadErrorIntervalSet: boolean = false;
  loadErrorSeekStored: number = 0;

  // Transcript
  transcriptEnabled: boolean = false;
  transcriptVisible: boolean = false;
  maxWordsOnScreen: number = 3;
  lookaheadSeconds: number = 10;
  wordList: any = [];
  wordMap: Map<string, any> = new Map();
  displaySegment: any;
  displaySegments: any = [];
  displaySegmentStored: any;

  // Track Navigation
  seekAmountSeconds: number = 5;
  seekButtonHoldDelay: number = 250;
  playing: boolean = false;
  nextHold: boolean = false;
  previousHold: boolean = false;
  nextHoldTimeoutId: number | undefined;
  previousHoldTimeoutId: number | undefined;

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
    event.preventDefault();
    this.seekToTime(this.audioGlobal.seek() - this.seekAmountSeconds);
  }

  @HostListener('window:keydown.arrowRight', ['$event'])
  handleRightArrow(event: any) {
    event.preventDefault();
    this.seekToTime(this.audioGlobal.seek() + this.seekAmountSeconds);
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
              protected router: Router,
              @Inject(DOCUMENT) private document: Document,
              protected cdr: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.eventBus.onLoaded.subscribe(() => {
      // this.loading = false;
      this.cdr.detectChanges();
    });
    this.eventBus.onLoad.subscribe((content: any) => {
      this.loading = true;
      this.open = true;
      const storedInfo = LocalStorageUtil.getStorage(this.audioGlobal.content.uuid);
      if (storedInfo && !this.loadError) {
        this.seekToTime(storedInfo.seek);
      }
      this.audioGlobal.play();
      this.cdr.detectChanges();
    });
    this.eventBus.onPlay.subscribe((content: any) => {
      this.animate();
      this.playing = true;
      if (this.loadError) {
        this.audioGlobal.sound.stop();
        this.seekToTime(this.loadErrorSeekStored);
      }
      this.loadError = false;
      this.loadErrorIntervalSet = false;
      clearInterval(this.loadErrorIntervalId);
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
    this.eventBus.onPlayError.subscribe((content: any) => {
      alert('there was a play error')
    });
    this.eventBus.onLoadError.subscribe((content: any) => {
      const storedInfo = LocalStorageUtil.getStorage(this.audioGlobal.content.uuid);
      if (storedInfo) {
        if (storedInfo.seek > 0) {
          this.loadErrorSeekStored = storedInfo.seek;
          console.log(storedInfo.seek);
        }
      }
      this.loadError = true;
      this.playRetry();
    })
    this.eventBus.onAnimationFrame.subscribe((data: any) => {
      this.seek = data.seek;
    });
    const params = new URLSearchParams(window.location.search);
    const mmx = params.get('mmx');
    if (mmx) {
      const content = this.audioGlobal.contentList
        .find((content: any)=> content.mmx === mmx)
      if (!content) {
        this.clearQueryParams();
        return;
      }
      this.audioGlobal.changeContentAndTriggerPlay(content);
    }
  }

  // Play Retry Loop
  playRetry() {
    // Limit this to every 1 second
    if (!this.loadErrorIntervalSet) {
      this.loadErrorIntervalId = setInterval(() => {
        if (this.loadError) {
          console.log('Attempting to retry...');
          this.audioGlobal.changeContentAndTriggerPlay(this.audioGlobal.content);
        }
      }, 1000);
      this.loadErrorIntervalSet = true;
    }
  }

  // Animation Loop
  animate() {
    if (this.playing) {
      this.eventBus.onAnimationFrame.emit({content: this.audioGlobal.content, seek: this.audioGlobal.seek()});
      const percentProgress = (this.audioGlobal.seek() / this.audioGlobal.content.duration) * 100;
      this.seekBarMouseMode || this.seekBarTouchMode ?
        this.percentProgressPlaceholder = percentProgress:
        this.percentProgress = percentProgress;

      const wordList = this.getTranscript(this.seekFloor + 10);
      const nextDisplaySegments = this.toSegments(wordList);

      this.wordList = this.getTranscript(this.seekFloor);
      this.displaySegments = this.toSegments(this.wordList);

      this.displaySegment = this.getCurrentDisplaySegment(this.displaySegments, nextDisplaySegments, this.audioGlobal.seek());
      this.transcriptVisible = !!(this.displaySegment && this.displaySegment.length > 0);
      this.seekFloor = Math.floor(this.audioGlobal.seek());
      // Happens every 1 second of play time
      if (this.seekFloor !== this.seekFloorStored ) {
        if (this.previousHold) {
          this.audioGlobal.sound.seek(this.audioGlobal.seek() - this.seekAmountSeconds);
        }
        if (this.nextHold) {
          this.audioGlobal.sound.seek(this.audioGlobal.seek() + this.seekAmountSeconds);
        }
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
  handlePreviousTouchStart($event: TouchEvent) {
    $event.preventDefault();
    this.previousHoldTimeoutId = setTimeout(()=> {
      this.previousHold = true;
    }, this.seekButtonHoldDelay);
  }

  handlePreviousTouchEnd($event: TouchEvent) {
    clearTimeout(this.previousHoldTimeoutId);
    this.previousHold = false;
  }

  handleNextTouchStart($event: TouchEvent) {
    $event.preventDefault();
    this.nextHoldTimeoutId = setTimeout(()=> {
      this.nextHold = true;
    }, this.seekButtonHoldDelay);
  }

  handleNextTouchEnd($event: TouchEvent) {
    clearTimeout(this.nextHoldTimeoutId);
    this.nextHold = false;
  }

  handleNextIncrement($event: MouseEvent) {
    $event.preventDefault();
    if (!this.nextHold) {
      this.seekToTime(this.audioGlobal.seek() + this.seekAmountSeconds);
    }
  }

  handlePreviousIncrement($event: Event) {
    $event.preventDefault();
    if (!this.previousHold) {
      this.seekToTime(this.audioGlobal.seek() - this.seekAmountSeconds);
    }
  }

  handleNext() {
    const index = this.getTrackIndex(this.audioGlobal.content.uuid);
    if (index < (this.audioGlobal.contentList.length - 1)) {
      this.seekToTrack(index + 1);
    }
  }

  handlePrevious() {
    // If less than 3 seconds, go to previous track, if greater, restart
    if (this.audioGlobal.seek() < 3) {
      const index = this.getTrackIndex(this.audioGlobal.content.uuid);
      if (index > 0) {
        this.seekToTrack(index - 1);
        return;
      }
    }
    this.seekToTime(0);
    this.percentProgress = 0;
  }

  handlePlay() {
    if (this.playing) {
      this.audioGlobal.pause();
    } else {
      this.audioGlobal.play();
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
    this.audioGlobal.changeContentAndTriggerPlay(content);
    const storedInfo = LocalStorageUtil.getStorage(this.audioGlobal.content.uuid);
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
      this.percentProgress = (seek / this.audioGlobal.content.duration) * 100;
    }
  }

  handleSeekBarMouseClick() {
    if (this.innerWidth < 576) {
      this.seekBarMouseMode = false;
      this.seekBarTouchMode = false;
      return;
    } else {
      this.seekToTime(this.playheadSeconds);
    }
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
    this.playheadSeconds = (this.percentProgress / 100) * this.audioGlobal.content.duration;
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
    this.seekBarTouchMode = true;
  }

  handleSeekBarTouchEnd(event: TouchEvent) {

    // Determine what is a drag and what is a tap do this by timing the start to end. if 0.3 or less then its a tap, more then its a drag

    if (this.seekBarTouchMode) {
      this.seekToTime(this.playheadSeconds);
    }
    this.seekBarTouchMode = false;
  }

  calculateOffset(value: any, offset: number, touchOffset: number) {
    if (this.seekBarMouseMode) {
      return value - offset;
    }
    if (this.seekBarTouchMode) {
      return value - (offset + touchOffset);
    }
    return value;
  }

  // Transcript
  getCurrentDisplaySegment(displaySegments: any, nextDisplaySegments: any, seek: number) {
    if (!displaySegments || displaySegments.length === 0) {
      return;
    }
    for (let i = 0; i<displaySegments.length; i++) {
      let displaySegment = displaySegments[i];
      let previousSegment;
      let nextSegment;
      if (i > 0) {
        previousSegment = displaySegments[i-1][displaySegments[i-1].length - 1];
      }
      if (i < displaySegments.length - 1) {
        nextSegment = displaySegments[i+1][0];
      }

      let nextEnd: any;
      if (nextDisplaySegments && !nextSegment) {
         nextEnd = nextDisplaySegments[0][0].start;
      } else {
        nextEnd = displaySegment[displaySegment.length - 1].end;
      }

      let start = previousSegment ? previousSegment.end : displaySegment[0].start;
      let end = nextSegment ? nextSegment.start : nextEnd;
      if (seek > start && seek < end) {
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
          this.displaySegments = this.toSegments(this.wordList);
        }
      });
  }

  toSegments(wordList: any) {
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
    if (this.previousHold || this.nextHold) {
      return;
    }
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
    if (!this.audioGlobal.content) {
      return;
    }
    let storage: any;
    if (!localStorage.getItem('moup') || localStorage.getItem('moup') === 'undefined') {
      storage = [];
      storage.push({contentUuid: this.audioGlobal.content.uuid, seek: seekFloor});
      localStorage.setItem('moup', JSON.stringify(storage));
    }
    storage = JSON.parse(<string>localStorage.getItem('moup'));
    for (let storedInfo of storage) {
      if (storedInfo.contentUuid === this.audioGlobal.content?.uuid) {
        storedInfo.seek = seekFloor;
        localStorage.setItem('moup', JSON.stringify(storage));
        return;
      }
    }
    // Not found
    storage.push({contentUuid: this.audioGlobal.content?.uuid, seek: seekFloor});
    localStorage.setItem('moup', JSON.stringify(storage));
  }

  // Utilities
  buildCacheKey(seek: number, contentUuid: string) {
    return `${(Math.floor(seek / 10) * 10)}-${contentUuid}`;
  }

  calculateSeekFloorMultiple(seekFloor: number) {
    return (Math.floor(seekFloor / this.lookaheadSeconds) * this.lookaheadSeconds)
  }

  clearQueryParams() {
    this.router.navigate([], {
      queryParams: {},
      replaceUrl: true // Optional: replaces current history entry instead of adding a new one
    });
  }

  protected readonly TimeUtils = TimeUtils;
}
