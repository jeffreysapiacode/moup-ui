import {ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
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

  private innerWidth: any = window.innerWidth;
  apiUrl = environment.apiUrl;

  open: boolean = false;

  // Auto-Dictate
  MAX_WORDS_ON_SCREEN: number = 3;
  transcriptEnabled: boolean = true;
  wordList: any = [];
  displayArray: any = [];
  wordMap: Map<string, any> = new Map();
  transcriptVisible: boolean = false;
  displayChunk: any;

  seek: any = 0;
  playing: boolean = false;
  content: any;
  seekMode: boolean = false;
  percentSeek: any = 0;
  percentProgress: any = 0;
  playheadTime: any = TimeUtils.formatTime(0);

  // Seek Bar
  private seekModeLock: boolean = false;
  private storedSeek: number = 0;
  private playheadSeconds: number = 0;
  private startOffset: any = 0;
  private endOffset: any = 0;

  private seekFloor: any = 0;
  private getCurrentChunk: boolean = true;

  constructor(protected eventBus: EventBus,
              protected audioGlobal: AudioGlobal,
              protected http: HttpClient,
              protected cdr: ChangeDetectorRef) {}

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.innerWidth = window.innerWidth;
    this.calculateOffset();
  }

  @HostListener('document:keydown.space', ['$event'])
  handleGlobalSpacebar(event: any) {
    event.preventDefault();
    this.onPlay();
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
      this.getCurrentChunk = true;
      this.seekFloor = Math.floor(this.audioGlobal.seek());
      this.fetchAndCacheTranscript(this.seekFloor);
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
      if (this.audioGlobal.available()) {
        this.audioGlobal.play();
        this.eventBus.onPlay.emit(this.content);
      }
    }
  }

  count: number = 0;

  animate() {
    if (this.audioGlobal.available() && this.playing) {
      setTimeout(() => {
        if (!this.seekMode) {
          this.percentProgress = (this.audioGlobal.seek() / this.content.duration) * 100;
        }
      }, 0);
      if (this.seekMode) {
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
          if (this.transcriptEnabled) {
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

  getDisplayChunk(displayArray: any) {
    for (let displayChunk of displayArray) {
      let start = displayChunk[0].start;
      let end = displayChunk[displayChunk.length - 1].end;
      if (this.audioGlobal.seek() > start && this.audioGlobal.seek() < end) {
        return displayChunk;
      }
    }
  }

  fetchAndCacheTranscript(seekFloor: any) {
    const seekFloorFloor = (Math.floor(seekFloor / 10) * 10);
    let start = seekFloorFloor;
    let end = seekFloorFloor + 10;
    const compKey =  seekFloorFloor + '-' + this.audioGlobal.content.uuid;
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
      if (index === (length - 1) && tempArray.length < this.MAX_WORDS_ON_SCREEN) {
        nestedArray.push(tempArray);
      }
      if (counter >= (this.MAX_WORDS_ON_SCREEN - 1)) {
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
    console.log('Getting word: ' + start + ' and ' + end + ' and ' + compKey );
    this.http.get(this.apiUrl + '/auto-dictate?contentUuid=' + this.audioGlobal.content.uuid + '&start=' + start + '&end=' + end).subscribe((response: any) => {
      if (response.length > 0) {
        this.wordMap.set(compKey, response);
        this.wordList = this.getTranscript(this.seekFloor);
        this.displayArray = this.chunkData(this.wordList);
        return response;
      }
    });
  }

  getTranscript(seekFloor: any) {
    const compKey =  (Math.floor(seekFloor / 10) * 10) + '-' + this.audioGlobal.content.uuid;
    let wordMap = this.wordMap.get(compKey);
    console.log('In getTranscript');
    console.log(JSON.stringify(wordMap));
    return wordMap;
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
    if (this.getCurrentChuckRequired(this.audioGlobal.seek())) {
      console.log('Getting current chunk');
      this.getCurrentChunk = true;
    }
    console.log(JSON.stringify(this.wordMap));
    this.audioGlobal.sound.seek(this.playheadSeconds);
    this.audioGlobal.play();
    if (this.innerWidth < 576) {
      this.seekMode = false;
    }
  }

  getCurrentChuckRequired(seconds: number) {
    const seekFloor = (Math.floor(seconds / 10) * 10);
    const compKey = seekFloor + '-' + this.audioGlobal.content.uuid;
    const keyExists = this.wordMap.has(compKey);
    console.log(this.wordMap.keys());
    console.log('Does key '+compKey+' exist: ' + keyExists);
    console.log(JSON.stringify(this.wordMap));
    return true;
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
    this.getCurrentChunk = true;
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
