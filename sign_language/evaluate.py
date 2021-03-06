import torch
import slr_network_mf
import numpy as np
import cv2
from utils import video_augmentation, Decode
from collections import OrderedDict
import sys
from os import listdir
from os.path import isfile, join


def transform():
    print("Apply testing transform.")
    return video_augmentation.Compose([
        video_augmentation.CenterCrop(224),
        # video_augmentation.Resize(0.5),
        video_augmentation.ToTensor(),
    ])


data_aug = transform()


def modified_weights(state_dict, modified=False):
    state_dict = OrderedDict([(k.replace('.module', ''), v) for k, v in state_dict.items()])
    if not modified:
        return state_dict
    modified_dict = dict()
    return modified_dict


def evaluate(video_path, keypoint_path, predicted_sentence_path):
    print('evaluate model')
    print(video_path)
    print(keypoint_path)

    video = read_video(video_path)
    keypoint = load_keypoint(keypoint_path)

    gloss_dict = np.load('/home/minelab/dev/erhu-project/sign_language/preprocess/phoenix2014/gloss_dict.npy',
                         allow_pickle=True).item()
    num_classes = len(gloss_dict) + 1

    decoder = Decode(gloss_dict, num_classes, 'beam')

    print(gloss_dict)

    model = slr_network_mf.SLRModelMF(
        num_classes=num_classes,
        c2d_type="resnet18",
        conv_type=2,
        use_bn=1,
        gloss_dict=gloss_dict,
        temporal_embedd_dim=1024,
        use_temporal_attn=True
    )
    state_dict = torch.load('/home/minelab/dev/erhu-project/sign_language/attn_phoenix_2.pt')

    weights = modified_weights(state_dict['model_state_dict'], False)

    model.load_state_dict(weights, strict=False)

    model.eval()

    print(video)
    print(keypoint)

    video, keypoint = normalize(video, keypoint)

    print(video)
    print(keypoint)

    vid_length = video.shape[0]

    print(video.unsqueeze(0).shape)
    print(keypoint.unsqueeze(0).shape)
    print(torch.LongTensor([vid_length]).shape)

    with torch.no_grad():
        ret_dict = model(video.unsqueeze(0), keypoint.unsqueeze(0), torch.LongTensor([vid_length]), label=None,
                         label_lgt=None)

    # print(ret_dict)

    # print(ret_dict['sequence_logits'].shape)
    # print(ret_dict['feat_len'].shape)
    # exit()
    predict = decoder.decode(ret_dict['sequence_logits'], ret_dict['feat_len'], batch_first=False, probs=False)
    # print(predict[0])
    # print(type(predict[0]))
    text = []

    for x in predict[0]:
        # print(x[0])
        text.append((x[0]))

    print(' '.join(text))

    with open(predicted_sentence_path, 'w') as f:
        f.write(' '.join(text))


CROP_X = 200
CROP_TOP = 200


def read_video(path):
    # all_frames = [join(path, f) for f in listdir(path) if isfile(join(path, f))]
    #
    # return [cv2.cvtColor(cv2.imread(img_path), cv2.COLOR_BGR2RGB) for img_path in all_frames]

    try:
        cap = cv2.VideoCapture(path)
        video = []

        # cap.set(cv2.CAP_PROP_POS_MSEC, 50)

        while cap.isOpened():
            ret, frame = cap.read()
            if ret:
                # cropped = frame[0 + CROP_TOP:720, 0 + CROP_X:1280 - CROP_X]
                # resized_image = cv2.resize(frame, (256, 256))

                # append frame to be converted
                video.append(np.asarray(frame))
            else:
                break
        cap.release()

        return video
    except cv2.error as e:
        print(e)
        return False


def load_keypoint(path):
    # Keypoint config
    index_mirror = np.concatenate([
        [1, 3, 2, 5, 4, 7, 6, 9, 8, 11, 10, 13, 12, 15, 14, 17, 16],
        [21, 22, 23, 18, 19, 20],
        np.arange(40, 23, -1), np.arange(50, 40, -1),
        np.arange(51, 55), np.arange(59, 54, -1),
        [69, 68, 67, 66, 71, 70], [63, 62, 61, 60, 65, 64],
        np.arange(78, 71, -1), np.arange(83, 78, -1),
        [88, 87, 86, 85, 84, 91, 90, 89],
        np.arange(113, 134), np.arange(92, 113)
    ]) - 1
    assert (index_mirror.shape[0] == 133)

    selected = np.concatenate(([0, 5, 6, 7, 8, 9, 10],
                               [91, 95, 96, 99, 100, 103, 104, 107, 108, 111],
                               [112, 116, 117, 120, 121, 124, 125, 128, 129, 132]), axis=0),  # 27

    # load file info
    data = np.load(path, allow_pickle=True)

    return torch.from_numpy(data[:, selected, :])


def normalize(video, keypoint, label=None, file_id=None):
    video, keypoint, label = data_aug(video, keypoint, label, file_id)

    if isinstance(keypoint, torch.Tensor):
        keypoint = keypoint.cpu().detach().numpy()

    video = video.float() / 127.5 - 1
    keypoint = 2. * (keypoint - np.min(keypoint)) / np.ptp(keypoint) - 1
    return video, torch.from_numpy(keypoint)


def data_to_device(self, data):
    if isinstance(data, torch.FloatTensor):
        return data.to(self.output_device)
    elif isinstance(data, torch.DoubleTensor):
        return data.float().to(self.output_device)
    elif isinstance(data, torch.ByteTensor):
        return data.long().to(self.output_device)
    elif isinstance(data, torch.LongTensor):
        return data.to(self.output_device)
    elif isinstance(data, list) or isinstance(data, tuple):
        return [self.data_to_device(d) for d in data]
    else:
        raise ValueError(data.shape, "Unknown Dtype: {}".format(data.dtype))


# if __name__ == '__main__':
#     # video = '/home/minelab/dev/VAC_CSLR/dataset/csl/video/000020/P50_s3_00_2._color.avi'
#     # keypoint = '/home/minelab/dev/VAC_CSLR/dataset/csl/keypoint/000020/P50_s3_00_2._color.avi.npy'
#
#     # video = '/home/minelab/dev/erhu-project/sign_language/result/test1.mp4'
#     # keypoint = '/home/minelab/dev/erhu-project/sign_language/result/test1.npy'
#
#     # video = '/home/minelab/dev/erhu-project/sign_language/test_phoenix/processed.mp4'
#     # keypoint = '/home/minelab/dev/erhu-project/sign_language/test_phoenix/processed.npy'
#     #
#     # evaluate(video, keypoint, "/home/minelab/dev/erhu-project/sign_language/result/test1.mp4.txt")

if __name__ == '__main__':
    globals()[sys.argv[1]](sys.argv[2], (sys.argv[3]), (sys.argv[4]))
