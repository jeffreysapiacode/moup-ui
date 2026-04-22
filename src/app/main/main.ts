import { Component } from '@angular/core';
import {MediaPlayer} from './media-player/media-player';

@Component({
  selector: 'app-main',
  imports: [
    MediaPlayer
  ],
  templateUrl: './main.html',
  styleUrl: './main.sass',
})
export class Main {}
