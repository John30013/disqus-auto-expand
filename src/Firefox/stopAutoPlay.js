// Here's the format of an embedly embedded media item with autoplay:
// *://cdn.embedly.com/widgets/media.html
//   ?src=https%3A%2F%2Fwww.youtube.com%2Fembed%2FMfa6n7IH4NU%3Ffeature%3Doembed
//   &url=http%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DMfa6n7IH4NU
//   &image=https%3A%2F%2Fi.ytimg.com%2Fvi%2FMfa6n7IH4NU%2Fhqdefault.jpg
//   &key=21d07d84db7f4d66a55297735025d6d1
//   &type=text%2Fhtml
//   &schema=youtube
//   &auto_play=true&autoplay=1
//
// Blocking this in the browser (at least FF) doesn't seem to work. So this code
// will rewrite these URLs in the <iframe src> attribute to remove the &auto_play
// and &autoplay query parameters.