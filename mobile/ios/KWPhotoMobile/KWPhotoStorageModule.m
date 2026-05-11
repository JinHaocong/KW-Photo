#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

typedef struct {
  unsigned long long size;
  NSUInteger count;
} KWPhotoStorageStats;

static NSURL *KWPhotoURLFromString(NSString *uri)
{
  if (![uri isKindOfClass:[NSString class]] || uri.length == 0) {
    return nil;
  }

  NSURL *url = [NSURL URLWithString:uri];

  if (url.fileURL) {
    return url.URLByStandardizingPath;
  }

  return [NSURL fileURLWithPath:uri isDirectory:YES].URLByStandardizingPath;
}

static NSArray<NSURL *> *KWPhotoExcludedURLsFromOptions(NSDictionary *options)
{
  id excludedUris = options[@"excludedUris"];

  if (![excludedUris isKindOfClass:[NSArray class]]) {
    return @[];
  }

  NSMutableArray<NSURL *> *urls = [NSMutableArray array];

  for (id item in (NSArray *)excludedUris) {
    NSURL *url = KWPhotoURLFromString(item);

    if (url != nil) {
      [urls addObject:url];
    }
  }

  return urls;
}

static BOOL KWPhotoURLIsExcluded(NSURL *url, NSArray<NSURL *> *excludedURLs)
{
  NSString *path = url.URLByStandardizingPath.path;

  for (NSURL *excludedURL in excludedURLs) {
    NSString *excludedPath = excludedURL.URLByStandardizingPath.path;

    if ([path isEqualToString:excludedPath] || [path hasPrefix:[excludedPath stringByAppendingString:@"/"]]) {
      return YES;
    }
  }

  return NO;
}

static unsigned long long KWPhotoFileAllocatedSize(NSURL *url)
{
  NSDictionary<NSURLResourceKey, id> *values = [url resourceValuesForKeys:@[
    NSURLFileAllocatedSizeKey,
    NSURLFileSizeKey,
    NSURLTotalFileAllocatedSizeKey,
  ] error:nil];
  NSNumber *totalAllocatedSize = values[NSURLTotalFileAllocatedSizeKey];
  NSNumber *allocatedSize = values[NSURLFileAllocatedSizeKey];
  NSNumber *fileSize = values[NSURLFileSizeKey];

  return (totalAllocatedSize ?: allocatedSize ?: fileSize).unsignedLongLongValue;
}

static KWPhotoStorageStats KWPhotoStatsForURL(NSURL *url, NSArray<NSURL *> *excludedURLs)
{
  KWPhotoStorageStats stats = {0, 0};
  NSFileManager *fileManager = NSFileManager.defaultManager;

  if (KWPhotoURLIsExcluded(url, excludedURLs) || ![fileManager fileExistsAtPath:url.path]) {
    return stats;
  }

  NSNumber *isDirectory = nil;
  [url getResourceValue:&isDirectory forKey:NSURLIsDirectoryKey error:nil];

  if (![isDirectory boolValue]) {
    stats.size = KWPhotoFileAllocatedSize(url);
    stats.count = 1;
    return stats;
  }

  NSDirectoryEnumerator<NSURL *> *enumerator = [fileManager enumeratorAtURL:url
                                                 includingPropertiesForKeys:@[
                                                   NSURLIsDirectoryKey,
                                                   NSURLIsRegularFileKey,
                                                   NSURLFileAllocatedSizeKey,
                                                   NSURLFileSizeKey,
                                                   NSURLTotalFileAllocatedSizeKey,
                                                 ]
                                                                    options:0
                                                               errorHandler:^BOOL(NSURL * _Nonnull itemURL, NSError * _Nonnull error) {
    return YES;
  }];

  for (NSURL *itemURL in enumerator) {
    if (KWPhotoURLIsExcluded(itemURL, excludedURLs)) {
      [enumerator skipDescendants];
      continue;
    }

    NSNumber *isRegularFile = nil;
    [itemURL getResourceValue:&isRegularFile forKey:NSURLIsRegularFileKey error:nil];

    if (![isRegularFile boolValue]) {
      continue;
    }

    stats.size += KWPhotoFileAllocatedSize(itemURL);
    stats.count += 1;
  }

  return stats;
}

static KWPhotoStorageStats KWPhotoStatsForDirectory(NSSearchPathDirectory directory, NSArray<NSURL *> *excludedURLs)
{
  NSURL *url = [NSFileManager.defaultManager URLsForDirectory:directory inDomains:NSUserDomainMask].firstObject;

  if (url == nil) {
    KWPhotoStorageStats stats = {0, 0};
    return stats;
  }

  return KWPhotoStatsForURL(url, excludedURLs);
}

static KWPhotoStorageStats KWPhotoStatsForTemporaryDirectory(NSArray<NSURL *> *excludedURLs)
{
  NSURL *url = [NSURL fileURLWithPath:NSTemporaryDirectory() isDirectory:YES];

  return KWPhotoStatsForURL(url, excludedURLs);
}

static NSUInteger KWPhotoClearDirectoryChildren(NSURL *url, NSArray<NSURL *> *excludedURLs)
{
  NSFileManager *fileManager = NSFileManager.defaultManager;
  NSArray<NSURL *> *children = [fileManager contentsOfDirectoryAtURL:url
                                          includingPropertiesForKeys:nil
                                                             options:0
                                                               error:nil];
  NSUInteger deletedCount = 0;

  for (NSURL *childURL in children) {
    if (KWPhotoURLIsExcluded(childURL, excludedURLs)) {
      continue;
    }

    if ([fileManager removeItemAtURL:childURL error:nil]) {
      deletedCount += 1;
    }
  }

  return deletedCount;
}

static NSUInteger KWPhotoClearDirectory(NSSearchPathDirectory directory, NSArray<NSURL *> *excludedURLs)
{
  NSURL *url = [NSFileManager.defaultManager URLsForDirectory:directory inDomains:NSUserDomainMask].firstObject;

  if (url == nil) {
    return 0;
  }

  return KWPhotoClearDirectoryChildren(url, excludedURLs);
}

@interface KWPhotoStorage : NSObject <RCTBridgeModule>
@end

@implementation KWPhotoStorage

RCT_EXPORT_MODULE(KWPhotoStorage)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_REMAP_METHOD(getTemporaryStorageStats,
                 getTemporaryStorageStatsWithOptions:(NSDictionary *)options
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSArray<NSURL *> *excludedURLs = KWPhotoExcludedURLsFromOptions(options ?: @{});
  KWPhotoStorageStats cacheStats = KWPhotoStatsForDirectory(NSCachesDirectory, excludedURLs);
  KWPhotoStorageStats temporaryStats = KWPhotoStatsForTemporaryDirectory(@[]);
  KWPhotoStorageStats documentStats = KWPhotoStatsForDirectory(NSDocumentDirectory, @[]);
  KWPhotoStorageStats supportStats = KWPhotoStatsForDirectory(NSApplicationSupportDirectory, @[]);
  unsigned long long clearableSize = cacheStats.size + temporaryStats.size;
  unsigned long long appDataSize = clearableSize + documentStats.size + supportStats.size;

  resolve(@{
    @"appDataSize": @(appDataSize),
    @"applicationSupportSize": @(supportStats.size),
    @"cacheCount": @(cacheStats.count),
    @"cacheSize": @(cacheStats.size),
    @"clearableCount": @(cacheStats.count + temporaryStats.count),
    @"clearableSize": @(clearableSize),
    @"documentSize": @(documentStats.size),
    @"temporaryCount": @(temporaryStats.count),
    @"temporarySize": @(temporaryStats.size),
  });
}

RCT_REMAP_METHOD(clearTemporaryStorage,
                 clearTemporaryStorageWithOptions:(NSDictionary *)options
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSArray<NSURL *> *excludedURLs = KWPhotoExcludedURLsFromOptions(options ?: @{});
  NSUInteger deletedCount = 0;

  [NSURLCache.sharedURLCache removeAllCachedResponses];
  deletedCount += KWPhotoClearDirectory(NSCachesDirectory, excludedURLs);
  deletedCount += KWPhotoClearDirectoryChildren([NSURL fileURLWithPath:NSTemporaryDirectory() isDirectory:YES], @[]);

  resolve(@{ @"deletedCount": @(deletedCount) });
}

@end
