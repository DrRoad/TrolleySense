//
//  ViewController.m
//  controlley
//
//  Created by Victor Ortiz on 8/19/17.
//  Copyright © 2017 va2ron1. All rights reserved.
//

#import "ViewController.h"
@import Mapbox;


@interface ControlleyAnnotation : MGLPointAnnotation
@property (nonatomic, assign) BOOL isTrolley;
@end

@implementation ControlleyAnnotation
@end

@interface ViewController ()<MGLMapViewDelegate>
@property (nonatomic) MGLMapView *mapView;

@end

@implementation ViewController

- (void)viewDidLoad {
	[super viewDidLoad];
	// Do any additional setup after loading the view, typically from a nib.
	self.mapView = [[MGLMapView alloc] initWithFrame:self.view.bounds styleURL:[MGLStyle lightStyleURL]];
	
	self.mapView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
	
	// Set the map’s center coordinate and zoom level.
	[self.mapView setCenterCoordinate:CLLocationCoordinate2DMake(18.4008, -66.1540)
							zoomLevel:12
							 animated:NO];
	
	[self.view addSubview:self.mapView];
	
	self.mapView.delegate = self;
	
}

- (MGLAnnotationImage *)mapView:(MGLMapView *)mapView imageForAnnotation:(id <MGLAnnotation>)annotation {
	
	//if ([annotation isKindOfClass:[ControlleyAnnotation class]]) {
		
	//}
	
	ControlleyAnnotation *castAnnotation = (ControlleyAnnotation *)annotation;
	MGLAnnotationImage *annotationImage;
	
	if (castAnnotation.isTrolley) {
		// For better performance, always try to reuse existing annotations.
		annotationImage = [mapView dequeueReusableAnnotationImageWithIdentifier:@"trolley"];
		
		// If there is no reusable annotation image available, initialize a new one.
		if (!annotationImage) {
			UIImage *image = [UIImage imageNamed:@"trolley"];
			image = [image imageWithAlignmentRectInsets:UIEdgeInsetsMake(0, 0, image.size.height/2, 0)];
			annotationImage = [MGLAnnotationImage annotationImageWithImage:image reuseIdentifier:@"trolley"];
		}
	}else{
		// For better performance, always try to reuse existing annotations.
		annotationImage = [mapView dequeueReusableAnnotationImageWithIdentifier:@"station"];
		
		// If there is no reusable annotation image available, initialize a new one.
		if (!annotationImage) {
			UIImage *image = [UIImage imageNamed:@"station"];
			image = [image imageWithAlignmentRectInsets:UIEdgeInsetsMake(0, 0, image.size.height/2, 0)];
			annotationImage = [MGLAnnotationImage annotationImageWithImage:image reuseIdentifier:@"station"];
		}
	}
	
	
	return annotationImage;
}
// Wait until the map is loaded before adding to the map.
- (void)mapView:(MGLMapView *)mapView didFinishLoadingStyle:(MGLStyle *)style {
	[self loadGeoJSON:@"center" andColor:[UIColor redColor]];
	[self loadGeoJSON:@"norte" andColor:[UIColor yellowColor]];
	[self loadGeoJSON:@"sur" andColor:[UIColor brownColor]];
	
	NSMutableArray *array = [[NSMutableArray alloc] init];
	ControlleyAnnotation *anotation;
	
	NSError *error;
	NSString *url_string = [NSString stringWithFormat: @"http://tsapi.imaginary.tech/stop"];
	NSData *data = [NSData dataWithContentsOfURL: [NSURL URLWithString:url_string]];
	NSMutableDictionary *json = [NSJSONSerialization JSONObjectWithData:data options:kNilOptions error:&error];
	
	for(NSDictionary *station in [json objectForKey:@"data"]){
		anotation = [[ControlleyAnnotation alloc] init];
		anotation.title = [station objectForKey:@"name"];
		anotation.coordinate = CLLocationCoordinate2DMake([[station objectForKey:@"lat"] floatValue], [[station objectForKey:@"lon"] floatValue]);
		anotation.isTrolley = NO;
		[array addObject:anotation];
	}
	
	url_string = [NSString stringWithFormat: @"http://tsapi.imaginary.tech/trolley"];
	data = [NSData dataWithContentsOfURL: [NSURL URLWithString:url_string]];
	json = [NSJSONSerialization JSONObjectWithData:data options:kNilOptions error:&error];
	
	
	for(NSDictionary *station in [json objectForKey:@"data"]){
		anotation = [[ControlleyAnnotation alloc] init];
		anotation.title = [station objectForKey:@"name"];
		anotation.coordinate = CLLocationCoordinate2DMake([[station objectForKey:@"lat"] floatValue], [[station objectForKey:@"lon"] floatValue]);
		anotation.isTrolley = YES;
		[array addObject:anotation];
	}
	
	// Add all annotations to the map all at once, instead of individually.
	[self.mapView addAnnotations:array];
}

- (BOOL)mapView:(MGLMapView *)mapView annotationCanShowCallout:(id <MGLAnnotation>)annotation {
	// Always allow callouts to popup when annotations are tapped.
	return YES;
}

- (void)loadGeoJSON:(NSString*)file andColor:(UIColor *)color{
	dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
		NSString *path = [[NSBundle mainBundle] pathForResource:file ofType:@"geojson"];
		NSData *jsonData = [NSData dataWithContentsOfFile:path];
		
		//NSMutableDictionary *s = [NSJSONSerialization JSONObjectWithData:jsonData options:0 error:NULL];
		//NSLog(@"%@",s);
		
		dispatch_async(dispatch_get_main_queue(), ^{
			[self drawPolyline:jsonData andColor:color andID:file];
		});
	});
}

- (void)drawPolyline:(NSData *)geoJson andColor:(UIColor *)color andID:(NSString*)id {
	// Add our GeoJSON data to the map as an MGLShapeSource.
	// We can then reference this data from an MGLStyleLayer.
	MGLShape *shape = [MGLShape shapeWithData:geoJson encoding:NSUTF8StringEncoding error:nil];
	MGLSource *source = [[MGLShapeSource alloc] initWithIdentifier:[NSString stringWithFormat:@"polyline_%@",id] shape:shape options:nil];
	[self.mapView.style addSource:source];
	
	// Create new layer for the line
	MGLLineStyleLayer *layer = [[MGLLineStyleLayer alloc] initWithIdentifier:[NSString stringWithFormat:@"polyline_%@",id]  source:source];
	layer.lineJoin = [MGLStyleValue valueWithRawValue:[NSValue valueWithMGLLineJoin:MGLLineJoinRound]];
	layer.lineCap = [MGLStyleValue valueWithRawValue:[NSValue valueWithMGLLineCap:MGLLineCapRound]];
	layer.lineColor = [MGLStyleValue valueWithRawValue:[UIColor colorWithRed:59/255.0 green:178/255.0 blue:208/255.0 alpha:1]];
	// Use a style function to smoothly adjust the line width from 2pt to 20pt between zoom levels 14 and 18. The `interpolationBase` parameter allows the values to interpolate along an exponential curve.
	layer.lineWidth = [MGLStyleValue valueWithInterpolationMode:MGLInterpolationModeExponential
													cameraStops:@{
																  @14: [MGLStyleValue valueWithRawValue:@2],
																  @18: [MGLStyleValue valueWithRawValue:@20]
																  }
														options:@{MGLStyleFunctionOptionDefaultValue:@1.5}];
	
	// We can also add a second layer that will draw a stroke around the original line.
	MGLLineStyleLayer *casingLayer = [[MGLLineStyleLayer alloc] initWithIdentifier:[NSString stringWithFormat:@"polyline-case_%@",id]  source:source];
	// Copy these attributes from the main line layer.
	casingLayer.lineJoin = layer.lineJoin;
	casingLayer.lineCap = layer.lineCap;
	// Line gap width represents the space before the outline begins, so should match the main line’s line width exactly.
	casingLayer.lineGapWidth = layer.lineWidth;
	// Stroke color slightly darker than the line color.
	casingLayer.lineColor = [MGLStyleValue valueWithRawValue:/*[UIColor colorWithRed:41/255.0 green:145/255.0 blue:171/255.0 alpha:1]*/color];
	// Use a style function to gradually increase the stroke width between zoom levels 14 and 18.
	casingLayer.lineWidth = [MGLStyleValue valueWithInterpolationMode:MGLInterpolationModeExponential
														  cameraStops:@{
																		@14: [MGLStyleValue valueWithRawValue:@1],
																		@18: [MGLStyleValue valueWithRawValue:@4]
																		}
															  options:@{MGLStyleFunctionOptionDefaultValue:@1.5}];
	
	// Just for fun, let’s add another copy of the line with a dash pattern.
	MGLLineStyleLayer *dashedLayer = [[MGLLineStyleLayer alloc] initWithIdentifier:[NSString stringWithFormat:@"polyline-dash_%@",id]  source:source];
	dashedLayer.lineJoin = layer.lineJoin;
	dashedLayer.lineCap = layer.lineCap;
	dashedLayer.lineWidth = layer.lineWidth;
	dashedLayer.lineColor = [MGLStyleValue valueWithRawValue:[UIColor whiteColor]];
	dashedLayer.lineOpacity = [MGLStyleValue valueWithRawValue:@0.5];
	// Dash pattern in the format [dash, gap, dash, gap, ...]. You’ll want to adjust these values based on the line cap style.
	dashedLayer.lineDashPattern = [MGLStyleValue valueWithRawValue:@[@0, @1.5]];
	
	[self.mapView.style addLayer:layer];
	[self.mapView.style addLayer:dashedLayer];
	[self.mapView.style insertLayer:casingLayer belowLayer:layer];
}


- (void)didReceiveMemoryWarning {
	[super didReceiveMemoryWarning];
	// Dispose of any resources that can be recreated.
}



@end
