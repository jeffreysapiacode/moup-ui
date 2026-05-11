import {ChangeDetectorRef, Component, HostListener, OnInit} from '@angular/core';
import {ContentCard} from './content-card/content-card';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';
import {MediaPlayer} from './media-player/media-player';
import {NgClass} from '@angular/common';
import {AudioGlobal} from '../service/audio-global';
import {Subscription} from 'rxjs';

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
  error: boolean = false;
  statusCode: any;
  waitForResponse: boolean = false;
  contentSubscription: Subscription | undefined;

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.innerWidth = window.innerWidth;
  }

  constructor(protected http: HttpClient,
              protected audioGlobal: AudioGlobal,
              protected cdr: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.innerWidth = window.innerWidth;
    this.handleGetContent();
  }

  handleGetContent() {
    this.loading = true;
    this.error = false;
    this.statusCode = null;
    this.waitForResponse = false;
    setTimeout(() => {
      if (this.statusCode) {
        this.loading = false;
        this.cdr.detectChanges();
      } else {
        this.waitForResponse = true;
        this.waitForResponseLoop();
      }
    }, 2000);
    const timeoutId = setTimeout(()=>{
      if (this.waitForResponse) {
        this.contentSubscription?.unsubscribe();
        this.waitForResponse = false;
        setTimeout(()=> {
          this.loading = false;
          this.error = true;
          this.cdr.detectChanges();
        })
      }
    }, 10000);
    this.contentSubscription = this.http.get(this.apiUrl + '/content', { observe: 'response' })
      .subscribe((response: any) => {
        this.statusCode = response.status;
        clearTimeout(timeoutId);
        this.audioGlobal.contentList = response.body;
      }, (error: any) => {
        this.statusCode = error.status;
        this.error = true;
      }, () => {
        this.loading = false;
      });
  }

  click() {

  }

  waitForResponseLoop() {
    if (this.waitForResponse) {
      if (this.statusCode === 200) {
        this.waitForResponse = false;
        this.loading = false;
        this.cdr.detectChanges();
      }
      requestAnimationFrame(this.waitForResponseLoop.bind(this));
    }
  }
}
