import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {ContentCard} from './content-card/content-card';
import {HttpClient} from '@angular/common/http';
import { environment } from '../../environments/environment';
import {MediaPlayer} from './media-player/media-player';
import {NgClass} from '@angular/common';
import {GlobalData} from '../service/global-data';

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

  public contentList: any = [];

  constructor(private http: HttpClient, protected globalData: GlobalData, private cdr: ChangeDetectorRef) {
    const apiUrl = environment.apiUrl;
    this.http.get(apiUrl + '/content')
      .subscribe((contentList : any) => {
        this.globalData.contentList  = contentList;
        this.cdr.detectChanges();
      });
  }

  ngOnInit(): void {

  }

}
