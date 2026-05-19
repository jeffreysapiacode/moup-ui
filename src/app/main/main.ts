import {AfterViewChecked, ChangeDetectorRef, Component, HostListener, OnInit} from '@angular/core';
import {ContentCard} from './content-card/content-card';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';
import {MediaPlayer} from './media-player/media-player';
import {NgClass} from '@angular/common';
import {AudioGlobal} from '../service/audio-global';
import {Subscription} from 'rxjs';
import {ActivatedRoute, Router} from '@angular/router';

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
  waitForResponseRequired: boolean = false;
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
    setInterval(() => {
      this.http.get(this.apiUrl + '/content')
        .subscribe((response: any) => {
          this.audioGlobal.contentList = response;
          this.cdr.detectChanges();
        }, (error: any) => {});
    }, 60000);
  }

  handleGetContent() {
    this.loading = true;
    this.error = false;
    this.statusCode = null;
    this.waitForResponseRequired = false;
    setTimeout(() => {
      if (this.statusCode) {
        this.loading = false;
        this.cdr.detectChanges();
      } else {
        this.waitForResponseRequired = true;
        this.waitForResponseLoop();
      }
    }, 2000);
    // Set service timeout timer for 10 seconds
    const timeoutId = setTimeout(()=>{
      if (this.waitForResponseRequired) {
        this.contentSubscription?.unsubscribe();
        this.waitForResponseRequired = false;
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

  waitForResponseLoop() {
    if (this.waitForResponseRequired) {
      if (this.statusCode === 200) {
        this.waitForResponseRequired = false;
        setTimeout(()=> {
          this.loading = false;
          this.cdr.detectChanges();
        })
      }
      requestAnimationFrame(this.waitForResponseLoop.bind(this));
    }
  }
}
