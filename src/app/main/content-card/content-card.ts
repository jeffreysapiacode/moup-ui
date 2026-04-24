import {Component, Input, OnInit} from '@angular/core';
import {EventBus} from '../../service/event-bus';

@Component({
  selector: 'app-content-card',
  imports: [],
  templateUrl: './content-card.html',
  styleUrl: './content-card.sass',
})
export class ContentCard implements OnInit {

  constructor(private eventBus: EventBus) {
  }

  ngOnInit(): void {
    this.eventBus.onPlay.subscribe((content) => {
      console.log('In content card played');
    });
    }

  @Input() public content: any;

  public handleDownload() {

  }

  public handlePlay() {
    this.eventBus.onPlay.emit(this.content);
    this.eventBus.onToggle.emit(true);
  }

}
