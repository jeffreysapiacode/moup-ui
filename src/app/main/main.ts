import {ChangeDetectorRef, Component, HostListener, OnInit} from '@angular/core';
import {ContentCard} from './content-card/content-card';
import {HttpClient} from '@angular/common/http';
import { environment } from '../../environments/environment';
import {MediaPlayer} from './media-player/media-player';
import {NgClass} from '@angular/common';
import {AudioGlobal} from '../service/audio-global';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {EventBus} from '../service/event-bus';

@Component({
  selector: 'app-main',
  imports: [
    ContentCard,
    MediaPlayer,
    NgClass
  ],
  templateUrl: './main.html',
  styleUrl: './main.sass',
})
export class Main implements OnInit {

  innerWidth: any;
  loading: boolean = false;
  apiUrl = environment.apiUrl;

  constructor(protected http: HttpClient,
              protected audioGlobal: AudioGlobal,
              protected cdr: ChangeDetectorRef) {
    this.loading = true;
    this.http.get(this.apiUrl + '/content')
      .subscribe((contentList : any) => {
        this.audioGlobal.contentList  = contentList;
        setTimeout(()=> {this.loading = false; this.cdr.detectChanges();}, 150);
      });
  }

  ngOnInit(): void {
    this.innerWidth = window.innerWidth;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.innerWidth = window.innerWidth;
  }
}
