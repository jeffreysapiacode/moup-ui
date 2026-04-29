import {ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {EventBus} from '../../service/event-bus';
import {NgClass, NgStyle} from '@angular/common';
import {GlobalData} from '../../service/global-data';

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

  public seekMode: boolean = false;

  constructor(private eventBus: EventBus, protected globalData: GlobalData, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.eventBus.onLoad.subscribe((content) => {
      this.content = content;
      this.isOpen = true;
    });
    this.eventBus.onPlay.subscribe((content) => {
      this.animate();
    });
    }

  onPlay() {
    if (this.globalData.playing) {
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

  animate() {
    if (this.globalData.sound && this.globalData.playing && !this.seekMode) {
      this.percentProgress = (this.globalData.sound.seek() / this.content.duration) * 100;
      this.cdr.detectChanges();
    }
    requestAnimationFrame(this.animate.bind(this));
  }

  handleOnMouseEnter() {
    this.seekMode = true;
  }

  handleOnMouseLeave() {
    this.seekMode = false;
  }

}
