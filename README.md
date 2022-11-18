## Grow your own app - Twine repository

This repo contains a version of Twine with the growyourownstory-1.0.0 Twine plugin as default.  You should be able to deploy this as a static website through github pages, and once deployed, create new Twine stories as needed (details of how to do this follow in this readme.).  

## Building / updating the plugin

The growyourownstory plugin is the place where you can record the story audio for deployment to the grow your own app webapp.  It is written in React, and is currently in a fledgling state, but it is possible to record your voice using the browser mic, import wav files and do some basic editing of audio.  The audio tracks are exported as mp3 base64 encoded strings, which means that the recordings can be managed as .json files (and easily stored in the browser and a backend database such as firebase).  There are a bunch of pros/cons with this decision, but it suffices for now.

To build the plugin first:

```
npm install
```

then

```
npm run build
```

Which will build a production version and copy the resulting files into the story-formats/growyourown-1.0.0 directory in the parent folder.

## Running Twine on github pages

Fork this repo. Clone on your machine.  Then update the gyoa_twine_plugin/.env file to:

PUBLIC_URL=https://[yourgithubname].github.io/storyweb/story-formats/growyourown-1.0.0

Then push the changes.

Then on github, go to settings and then click on the left hand Pages tab.  Then under 'Build and deployment', click on the Source dropdown and click on the main branch.  Give it a while (several minutes) then you should be able to go to:

[yourgithubname].github.io/gyoa_twine

## Creating a story

You can more or less use Twine as intended.  It is assumed that each passage will be in to form of a script, with the name of the 'actor' then the words to be spoken.  At the end of the passage you'll need to determine which passage to go to next, and what triggers the move to the next passage.  This is done with a twine link in the form [[linkname->passagename]].  For building our stories, the link name corresponds to a trigger word. Currently this is a limited vocabulary and consists of: 'one','two,'three','four','five','six','seven',eight','nine','yes', 'no', 'up', 'down', 'left' and 'right', 'stop' and 'go'.  You can also specify that you want to move to a new passage automatically after a timeout (in seconds), by making a linkname a number (e.g. 1,2,3...).

So the following passage is read by a narrator and will move to the 'Start' passage when a user says 'yes'. 

[Naration] Hello!  Are you ready to go on an adventure?  I’ll be telling you part of the story, but you’ll meet lots of other characters along the way.  Sometimes you’ll even have choices to make to decide what happens in the adventure, so listen well and get ready to use your imagination.  
Say ‘yes’ when you are ready to begin…
[[yes->Start]]

And the following is a passage read ny multiple users.  After 10 seconds it will move to 'Travel Onward' if a person hasn't said 'Yes'.  if they say 'yes' it'll move to the 'Climb Stairs' passage and if they say 'No' it will move to 'Travel Onwards' before the 10 seconds is up.

[Toran] But just in case, take this along with you.
[Ren] Ooooh it's a bottle filled with bright purple powder.  But... what is it for?
[Toran] This is a vial of dragon pepper.  If Ignithrax breathes it in, he won’t be able to stop sneezing until he’s dunked his face in a lake.  So if you find yourself in a tight spot, it might come in handy.
[Ren] Thank you, Captain Torran!
[Torran] You’re welcome.  I hope it helps!
[Ren] Well, alright then.  I guess we'd better get started…
[Torran] There are many ways up the mountain, adventurers, and may be many challenges along the way!  Good luck! 

[[10->Travel Onward]]
[[yes->Climb Stairs]]
[[no->Travel Onward]]


The plugin also requires that you name each scene.  You do this by giving it a tag name.  Finally, the webapp also gives users the option to jump between main scenes without having to go through the full navigation. To mark a passage as one that can be jumped to, give it a tag called 'Waypoint'


## Using the plugin

Once you have created your story, to start recording audio for it, click on the 'build'-'play' menu (on the toolbar). This will set out all of the tagged passages.  If you click on a passage, it will give the option to record audio or add tracks.  Once you have a recorded track you can select elements of it to edit it (and of course play it back).  You can also add additional tracks wav files only, by clicking 'add track'.  If you have set up the gyoa webapp, then, once done you can click 'publish to app' and it will publish the audio to the app.  Note that you can also download your recordings if you want to move between browsers or share with others.








