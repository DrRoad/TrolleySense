//
//  ViewController.h
//  controlley
//
//  Created by Victor Ortiz on 8/19/17.
//  Copyright © 2017 va2ron1. All rights reserved.
//

#import <UIKit/UIKit.h>

@interface ViewController : UIViewController
@property(nonatomic, strong) IBOutlet UILabel *name;
@property(nonatomic, strong) IBOutlet UILabel *status;
-(IBAction)sendSensorData:(id)sender;
@end

