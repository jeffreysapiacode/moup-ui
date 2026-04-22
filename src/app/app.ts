import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {Main} from './main/main';
import {MediaPlayer} from './main/media-player/media-player';

@Component({
  selector: 'app-root',
  imports: [Main, MediaPlayer],
  templateUrl: './app.html',
  styleUrl: './app.sass'
})
export class App {
  protected readonly title = signal('moup-ui');
}
