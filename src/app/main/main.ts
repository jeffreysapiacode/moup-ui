import {Component, OnInit} from '@angular/core';
import {ContentCard} from './content-card/content-card';
import {HttpClient} from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-main',
  imports: [
    ContentCard
  ],
  templateUrl: './main.html',
  styleUrl: './main.sass',
})
export class Main implements OnInit {

  public contentList: any = [];

  constructor(private http: HttpClient) {
    const apiUrl = environment.apiUrl;
    this.http.get(apiUrl + '/content')
      .subscribe((contentList : any) => {
        this.contentList = contentList;
        console.log(JSON.stringify(this.contentList));
      });
  }

  ngOnInit(): void {

  }

  onClick() {

  }

}
