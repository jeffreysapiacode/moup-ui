import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {Howl} from 'howler';
import {EventBus} from '../../service/event-bus';
import {NgClass} from '@angular/common';

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

  constructor(private eventBus: EventBus) {
  }

  ngOnInit(): void {
    this.eventBus.onPlay.subscribe((content) => {
      if (this.content !== content) {
        this.onPlay();
      }
      this.content = content;
      // If this.content !== content, run logic to switch track, otherwise, do play/pause logic
    });

    this.eventBus.onToggle.subscribe((isOpen) => {
      this.isOpen = isOpen
    })
    }

  onPlay() {
    this.eventBus.onToggle.emit(true);
    this.eventBus.onPlay.emit(this.content);
    if(!this.content){return;}
    const sound = new Howl({
      src: ['http://localhost:8080/stream/' + this.content?.filename],
      html5: true
    });
    sound.once('load', () => {
      // Send play count trigger
    });
    sound.on('play', ()=> {});
    sound.on('pause', () => {});
    sound.on('end', ()=> {});
    sound.on('loaderror', ()=> {});
    sound.on('playerror', () => {});

    sound.play();
  }

}
