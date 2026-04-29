import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {EventBus} from '../../service/event-bus';
import {NgClass} from '@angular/common';
import {GlobalData} from '../../service/global-data';

@Component({
  selector: 'app-media-player',
  imports: [
    NgClass
  ],
  templateUrl: './media-player.html',
  styleUrl: './media-player.sass',
})
export class MediaPlayer implements OnInit {

  public content: any;
  public isOpen: boolean = false;

  constructor(private eventBus: EventBus, private globalData: GlobalData) {
  }

  ngOnInit(): void {
    this.eventBus.onLoad.subscribe((content) => {
      this.content = content;
      this.isOpen = true;
      console.log('get here');
    });
    }

  onPlay() {
    if (this.globalData.playing) {
      this.globalData.sound.pause();
    } else {
      this.globalData.sound.play();
    }
  }

}
