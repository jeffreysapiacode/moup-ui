import {ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {EventBus} from '../../service/event-bus';
import { environment } from '../../../environments/environment';
import {Howl} from 'howler';
import {GlobalData} from '../../service/global-data';
import {TimeUtils} from '../../util/time-utils';

@Component({
  selector: 'app-content-card',
  imports: [],
  templateUrl: './content-card.html',
  styleUrl: './content-card.sass',
})
export class ContentCard implements OnInit {

  @Input() public content: any;
  apiUrl = environment.apiUrl;
  time: any = '0:0';

  constructor(private eventBus: EventBus, protected globalData: GlobalData, private cdr: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.eventBus.onSeek.subscribe((data) => {
      console.log(data.content.uuid +' vs '+this.globalData.content.uuid);
      if (data.content.uuid === this.content.uuid) {
        this.time = TimeUtils.formatTime(data.seek);
        this.cdr.detectChanges();
      } else {
        this.time = '0:0';
      }
    })
  }

  public handleLoad() {
    if(this.content !== this.globalData.content) {
      Howler.stop();
      this.globalData.playing = false;
      this.globalData.sound = new Howl({
        src: ['http://localhost:8080/stream/' + this.content.filename],
        html5: true
      });
      this.globalData.sound.once('load', () => {
        // Send play count trigger
      });
      this.globalData.sound.on('play', (() => {
        this.globalData.playing = true;
        this.eventBus.onPlay.emit(this.content);
      }));
      this.globalData.sound.on('pause', () => {
        this.globalData.playing = false;
      });
      this.globalData.sound.on('end', ()=> {
        this.globalData.playing = false;
      });
      this.globalData.sound.on('loaderror', ()=> {
        this.globalData.playing = false;
      });
      this.globalData.sound.on('playerror', () => {
        this.globalData.playing = false;
      });
      this.globalData.setContent(this.content);
      this.globalData.sound.play()
    } else {
      if (this.globalData.playing) {
        this.globalData.sound.pause();
      } else {
        this.globalData.sound.play();
        this.eventBus.onPlay.emit(this.content);
      }
    }
  }

  formatTime (seconds: Number) {
    return TimeUtils.formatTime(seconds);
  }

}
