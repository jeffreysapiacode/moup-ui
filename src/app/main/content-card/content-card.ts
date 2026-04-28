import {Component, Input, OnInit} from '@angular/core';
import {EventBus} from '../../service/event-bus';
import {HttpClient} from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-content-card',
  imports: [],
  templateUrl: './content-card.html',
  styleUrl: './content-card.sass',
})
export class ContentCard implements OnInit {

  @Input() public content: any;
  apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private eventBus: EventBus,) {
  }

  ngOnInit(): void {
    this.eventBus.onPlay.subscribe((content) => {
    });
    }

  public handleDownload() {
    console.log('Download');
    this.http.get(this.apiUrl + '/download/' + this.content.filename, { responseType: 'blob' }).subscribe();
  }

  public handlePlay() {
    this.eventBus.onPlay.emit(this.content);
    this.eventBus.onToggle.emit(true);
  }

}
