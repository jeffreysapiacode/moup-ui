import {Component, Input, OnInit} from '@angular/core';
import {EventBus} from '../../service/event-bus';
import { environment } from '../../../environments/environment';
import {Howl} from 'howler';
import {GlobalData} from '../../service/global-data';

@Component({
  selector: 'app-content-card',
  imports: [],
  templateUrl: './content-card.html',
  styleUrl: './content-card.sass',
})
export class ContentCard implements OnInit {

  @Input() public content: any;
  apiUrl = environment.apiUrl;

  constructor(private eventBus: EventBus, protected globalData: GlobalData) {
  }

  ngOnInit(): void {}

  public handleLoad() {
    if(this.content !== this.globalData.content) {
      // A new track has been selected !!!
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
      }
    }
  }

}
