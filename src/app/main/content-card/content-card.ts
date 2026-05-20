import {AfterViewChecked, ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
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

  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  @Input() content: any;
  @Input() innerWidth: any;
  playing: boolean = false;
  videoPlaying: boolean = false;
  videoOverlayVisible: boolean = false;
  videoOverlayTimeoutId: number = 0;
  videoSeek: number = 0;
  elapsedOrSavedTime: any = TimeUtils.formatTime(0);
  apiUrl = environment.apiUrl;
  visible: boolean = false;
  video: any;

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

  handleLoad() {
    if (this.content !== this.audioGlobal.content) {
      this.audioGlobal.changeContentAndPlay(this.content);
    } else {
      if (this.playing) {
        this.audioGlobal.pause();
      } else {
        this.audioGlobal.play();
      }
    }
  }

  handleVideoLoaded() {
    // Call play increment endpoint
    this.eventBus.onLoaded.emit(this.content);
  }

  handleVideoPlay() {
    this.animate();
    this.eventBus.onPlay.emit(this.content);
    if (this.audioGlobal.content?.uuid !== this.content?.uuid) {
      this.audioGlobal.changeContentAndPlay(this.content);
    }
  }

  handleVideoPause() {
    this.eventBus.onPause.emit(this.content);
  }

  handleVideoEnd() {
    this.eventBus.onEnd.emit(this.content);
  }

  handleMouseMove() {
    this.videoOverlayVisible = true;
    if (this.videoOverlayTimeoutId) {
      clearTimeout(this.videoOverlayTimeoutId);
    }
    this.videoOverlayTimeoutId = setTimeout(() => {
      this.videoOverlayVisible = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  toggleFullscreen() {
    console.log('Toggle Fullscreen');
    const video = this.videoPlayer.nativeElement;

    if (!document.fullscreenElement) {
      // Enter fullscreen
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if ((video as any).webkitRequestFullscreen) { /* Safari */
        (video as any).webkitRequestFullscreen();
      } else if ((video as any).msRequestFullscreen) { /* IE11 */
        (video as any).msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  toggleVideoPlaying() {
    this.videoPlaying = !this.videoPlaying;
    const video = this.videoPlayer.nativeElement;
    video.paused ? video.play() : video.pause();
  }

  animate() {
    if (this.videoPlaying) {
      this.video = this.videoPlayer.nativeElement;
      this.videoSeek = this.video.currentTime;
      this.eventBus.onAnimationFrame.emit({content: this.audioGlobal.content, seek: this.videoSeek});
      this.cdr.detectChanges();
      requestAnimationFrame(this.animate.bind(this));
    }
  }

  getThumbnailUrl() {
    const nameWithoutExtension = this.content.filename.substring(0, this.content.filename.lastIndexOf('.'));
    return this.apiUrl + '/image/' + nameWithoutExtension + '.png';
  }

  protected readonly TimeUtils = TimeUtils;
  protected readonly console = console;
}
