//
//  ViewController.m
//  controlley
//
//  Created by Victor Ortiz on 8/19/17.
//  Copyright © 2017 va2ron1. All rights reserved.
//

#import "ViewController.h"
#import <CoreLocation/CoreLocation.h>

@interface ViewController () <CLLocationManagerDelegate> {
	CLLocation *location;
	NSString *trolley;
	int incoming, outcoming;
}
@property (nonatomic,strong) CLLocationManager *locationManager;

@end

@implementation ViewController

- (void)viewDidLoad {
	[super viewDidLoad];
	
	incoming = 0;
	outcoming = 0;
	
	UIAlertController *alert = [UIAlertController alertControllerWithTitle:@"ConTrolley" message:@"Antes de continuar asegurese que este conectado a la red del trolley." preferredStyle:UIAlertControllerStyleAlert];
	UIAlertAction *okAction = [UIAlertAction actionWithTitle:@"Continuar" style:UIAlertActionStyleDefault handler:^(UIAlertAction * action){
		[self.locationManager requestAlwaysAuthorization] ;
		if ([CLLocationManager locationServicesEnabled]) {
			
			UIAlertController *alert = [UIAlertController alertControllerWithTitle:@"ConTrolley" message:@"Favor indique cual trolley esta en su servicio el dia de hoy." preferredStyle:UIAlertControllerStyleAlert];
			[alert addTextFieldWithConfigurationHandler:^(UITextField *textField) {
				textField.placeholder = @"Numero de Trolley";
				textField.textColor = [UIColor blueColor];
				textField.clearButtonMode = UITextFieldViewModeWhileEditing;
				textField.borderStyle = UITextBorderStyleRoundedRect;
			}];
			
			UIAlertAction *okAction = [UIAlertAction actionWithTitle:@"Continuar" style:UIAlertActionStyleDefault handler:^(UIAlertAction * action){
				NSArray * textfields = alert.textFields;
				UITextField * namefield = textfields[0];
				trolley = namefield.text;
				self.name.text = trolley;
				
				self.locationManager = [[CLLocationManager alloc] init];
				self.locationManager.delegate = self;
				[self.locationManager startUpdatingLocation];
				[self refreshGPSData];
				[NSTimer scheduledTimerWithTimeInterval:5 target:self selector:@selector(refreshGPSData) userInfo: nil repeats:YES];
			}];
			[alert addAction:okAction];
			[self presentViewController:alert animated:YES completion:nil];
			
			
		} else {
			UIAlertController *alert = [UIAlertController alertControllerWithTitle:@"ConTrolley" message:@"Para poder utilizar esta aplicación favor de encender y/o autorizar los servicios de localizacion del dispositivo." preferredStyle:UIAlertControllerStyleAlert];
			UIAlertAction *okAction = [UIAlertAction actionWithTitle:@"Continuar" style:UIAlertActionStyleDefault handler:^(UIAlertAction * action){
				// Ok action example
			}];
			[alert addAction:okAction];
			[self presentViewController:alert animated:YES completion:nil];
		}
	}];
	[alert addAction:okAction];
	[self presentViewController:alert animated:YES completion:nil];
	
}

- (void)locationManager:(CLLocationManager *)manager didUpdateLocations:(NSArray *)locations
{
	location = [locations lastObject];
}

-(void)refreshGPSData{
	NSString *post = [NSString stringWithFormat:@"trolley=%@&lat=%f&lon=%f&speed=0&status=0",trolley,location.coordinate.latitude, location.coordinate.longitude];
	NSLog(@"Post: %@",post);
	NSData *postData = [post dataUsingEncoding:NSASCIIStringEncoding allowLossyConversion:YES];
	NSString *postLength = [NSString stringWithFormat:@"%lu",(unsigned long)[postData length]];
	NSMutableURLRequest *request = [[NSMutableURLRequest alloc] init];
	[request setURL:[NSURL URLWithString:@"http://tsapi.imaginary.tech/log/position"]];
	[request setHTTPMethod:@"POST"];
	[request setValue:postLength forHTTPHeaderField:@"Content-Length"];
	[request setValue:@"application/x-www-form-urlencoded" forHTTPHeaderField:@"Content-Type"];
	[request setHTTPBody:postData];
	
	NSURLSession *session = [NSURLSession sharedSession];
	NSURLSessionDataTask *dataTask = [session dataTaskWithRequest:request
												completionHandler:^(NSData *data, NSURLResponse *response, NSError *error)
									  {
										  NSLog(@"GPS Data Sended");
										  
										  
										  if(error == nil){
											  self.status.text = @"En Linea";
											  self.status.textColor = [UIColor greenColor];
										  }else{
											  self.status.text = @"Fallando";
											  self.status.textColor = [UIColor redColor];
										  }
										  
									  }];
	[dataTask resume];
}

-(IBAction)sendSensorData:(id)sender{
	NSError *error;
	NSString *url_string = [NSString stringWithFormat: @"http://192.168.4.1"];
	NSData *data = [NSData dataWithContentsOfURL: [NSURL URLWithString:url_string]];
	NSMutableDictionary *json = [NSJSONSerialization JSONObjectWithData:data options:kNilOptions error:&error];
	
	if(incoming > 0){
		incoming = [[json objectForKey:@"incomingCount"] intValue] - incoming;
	}else{
		incoming = [[json objectForKey:@"incomingCount"] intValue];
	}
	
	if(outcoming > 0){
		outcoming = [[json objectForKey:@"outgoingCount"] intValue] - outcoming;
	}else{
		outcoming = [[json objectForKey:@"outgoingCount"] intValue];
	}
	
	
	NSString *post = [NSString stringWithFormat:@"trolley=%@&incoming=%i&outgoing=%li&stop=1",trolley,[[json objectForKey:@"incomingCount"] intValue], [[json objectForKey:@"outgoingCount"] intValue]];
	NSLog(@"Post: %@",post);
	NSData *postData = [post dataUsingEncoding:NSASCIIStringEncoding allowLossyConversion:YES];
	NSString *postLength = [NSString stringWithFormat:@"%lu",(unsigned long)[postData length]];
	NSMutableURLRequest *request = [[NSMutableURLRequest alloc] init];
	[request setURL:[NSURL URLWithString:@"http://tsapi.imaginary.tech/log/passengers"]];
	[request setHTTPMethod:@"POST"];
	[request setValue:postLength forHTTPHeaderField:@"Content-Length"];
	[request setValue:@"application/x-www-form-urlencoded" forHTTPHeaderField:@"Content-Type"];
	[request setHTTPBody:postData];
	
	incoming = [[json objectForKey:@"incomingCount"] intValue];
	outcoming = [[json objectForKey:@"outgoingCount"] intValue];
	
	NSURLSession *session = [NSURLSession sharedSession];
	NSURLSessionDataTask *dataTask = [session dataTaskWithRequest:request
												completionHandler:^(NSData *data, NSURLResponse *response, NSError *error)
									  {
										  NSString *url_string = [NSString stringWithFormat: @"http://192.168.4.1/clean"];
										  data = [NSData dataWithContentsOfURL: [NSURL URLWithString:url_string]];
										  NSMutableDictionary *json = [NSJSONSerialization JSONObjectWithData:data options:kNilOptions error:&error];
										  NSLog(@"Data: %@",json);
									  }];
	[dataTask resume];
}

- (void)didReceiveMemoryWarning {
	[super didReceiveMemoryWarning];
	// Dispose of any resources that can be recreated.
}



@end
